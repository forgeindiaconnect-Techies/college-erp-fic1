import React, { useState, useEffect } from 'react';
import {
  Bus, Users, Navigation, Plus, Search, Download, 
  CreditCard, UserCheck, ShieldCheck, FileText, BarChart, Clock,
  CheckCircle, AlertCircle
} from 'lucide-react';
import { getTransportRoutes, getTransportDrivers, getTransportStudents, getStudents } from '../../api/index';
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area
} from 'recharts';
import './TransportManagement.css'; // Keep custom CSS but we will inject premium inline styles for the main layout

const CHART_DATA = [
  { month: 'Jul', riders: 320 }, { month: 'Aug', riders: 380 },
  { month: 'Sep', riders: 410 }, { month: 'Oct', riders: 405 },
  { month: 'Nov', riders: 425 }, { month: 'Dec', riders: 440 },
];



const TransportManagement = () => {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [search, setSearch] = useState('');
  const [routes, setRoutes] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [students, setStudents] = useState([]);
  const [driverAttendanceLogs, setDriverAttendanceLogs] = useState([]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // Assign Student Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({
    studentId: '',
    name: '',
    routeId: '',
    pickupPoint: '',
    feeStatus: 'Pending',
    amount: ''
  });

  // Report Modal State
  const [reportModal, setReportModal] = useState({
    isOpen: false,
    title: '',
    headers: [],
    rows: []
  });

  // Create Route Modal State
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [driverForm, setDriverForm] = useState({
    driverId: '', name: '', experience: '', license: '', phone: '', status: 'Active'
  });

  const handleAddDriver = (e) => {
    e.preventDefault();
    if (!driverForm.name || !driverForm.driverId) return;

    const newDriver = {
      _id: Date.now().toString(),
      ...driverForm
    };

    setDrivers(prev => {
      const updated = [newDriver, ...prev];
      localStorage.setItem(`erp_transport_drivers_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(updated));
      return updated;
    });
    showToast(`Successfully added driver ${driverForm.name}`);
    setShowDriverModal(false);
    setDriverForm({ driverId: '', name: '', experience: '', license: '', phone: '', status: 'Active' });
  };
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [routeForm, setRouteForm] = useState({
    routeId: '',
    name: '',
    vehicle: '',
    driver: '',
    capacity: 50,
    points: ''
  });

  const handleCreateRoute = (e) => {
    e.preventDefault();
    if (!routeForm.name || !routeForm.routeId) return;

    const newRoute = {
      _id: Date.now().toString(),
      routeId: routeForm.routeId,
      name: routeForm.name,
      vehicle: routeForm.vehicle,
      driver: routeForm.driver,
      capacity: Number(routeForm.capacity) || 50,
      occupied: 0,
      points: routeForm.points.split(',').map(p => p.trim()).filter(Boolean)
    };

    setRoutes(prev => {
      const updated = [newRoute, ...prev];
      localStorage.setItem(`erp_transport_routes_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(updated));
      return updated;
    });
    showToast(`Successfully created route ${routeForm.name}`);
    setShowRouteModal(false);
    setRouteForm({ routeId: '', name: '', vehicle: '', driver: '', capacity: 50, points: '' });
  };

  const handleAssignStudent = (e) => {
    e.preventDefault();
    if (!assignForm.studentId || !assignForm.routeId) return;

    const newStudent = {
      _id: Date.now().toString(),
      studentId: assignForm.studentId,
      name: assignForm.name || 'Unknown Student',
      routeId: assignForm.routeId,
      pickupPoint: assignForm.pickupPoint,
      feeStatus: assignForm.feeStatus,
      amount: Number(assignForm.amount) || 0
    };

    // Persist to localStorage so the Driver dashboard can read assigned students
    const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';
    const storageKey = `erp_transport_students_${tenantId}`;
    const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
    // Avoid duplicates — replace if same studentId already present
    const filtered = existing.filter(s => s.studentId !== newStudent.studentId);
    localStorage.setItem(storageKey, JSON.stringify([newStudent, ...filtered]));

    setStudents(prev => [newStudent, ...prev]);
    showToast(`Successfully assigned ${assignForm.studentId} to route ${assignForm.routeId}`);
    setShowAssignModal(false);
    setAssignForm({ studentId: '', name: '', routeId: '', pickupPoint: '', feeStatus: 'Pending', amount: '' });
  };

  const downloadCSV = (filename, rows) => {
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewManifest = () => {
    const headers = ["Student ID", "Name", "Route ID", "Pickup Point", "Fee Status", "Amount"];
    const rows = students.map(s => [
      s.studentId, s.name, s.routeId, s.pickupPoint, s.feeStatus, `₹${s.amount}`
    ]);
    setReportModal({
      isOpen: true,
      title: "Transport Student Manifest",
      headers,
      rows,
      filename: "Transport_Student_Manifest.csv"
    });
  };

  const handleViewDefaulters = () => {
    const headers = ["Student ID", "Name", "Route ID", "Pending Amount"];
    const defaulters = students.filter(s => s.feeStatus === 'Pending');
    const rows = defaulters.map(s => [
      s.studentId, s.name, s.routeId, `₹${s.amount}`
    ]);
    setReportModal({
      isOpen: true,
      title: "Transport Fee Defaulters",
      headers,
      rows,
      filename: "Transport_Fee_Defaulters.csv"
    });
  };

  const fetchTransportData = async () => {
    try {
      const [routesRes, driversRes, studentsRes, allStudentsRes] = await Promise.all([
        getTransportRoutes(),
        getTransportDrivers(),
        getTransportStudents(),
        getStudents().catch(() => ({ data: [] }))
      ]);
      const localRoutes = JSON.parse(localStorage.getItem(`erp_transport_routes_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`) || '[]');
      const combinedRoutes = [...routesRes.data, ...localRoutes];
      const uniqueRoutes = Array.from(new Map(combinedRoutes.map(item => [item.routeId, item])).values());
      setRoutes(uniqueRoutes);

      const localDrivers = JSON.parse(localStorage.getItem(`erp_transport_drivers_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`) || '[]');
      const combinedDrivers = [...driversRes.data, ...localDrivers];
      const uniqueDrivers = Array.from(new Map(combinedDrivers.map(item => [item.driverId, item])).values());
      setDrivers(uniqueDrivers);
      
      let combinedTransportStudents = [...studentsRes.data];

      // Merge from main students db
      const erpStudents = JSON.parse(localStorage.getItem(`erp_students_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`) || '[]');
      const allDbStudents = [...(allStudentsRes.data || [])];
      erpStudents.forEach(ls => {
        if (!allDbStudents.find(cs => cs.id === ls.id || cs.rollNo === ls.rollNo)) {
          allDbStudents.push(ls);
        }
      });

      const registeredTransport = allDbStudents.filter(s => s.transportRequired?.toLowerCase() === 'yes');
      registeredTransport.forEach(s => {
        if (!combinedTransportStudents.find(ts => ts.studentId === s.id)) {
          combinedTransportStudents.push({
            _id: s.id,
            studentId: s.id,
            name: s.name,
            routeId: s.busRoute || 'Unassigned',
            pickupPoint: s.pickupPoint || 'Not specified',
            feeStatus: (s.transportFeeStatus || 'Pending').charAt(0).toUpperCase() + (s.transportFeeStatus || 'Pending').slice(1),
            amount: s.transportFeeAmount || 0
          });
        }
      });

      setStudents(combinedTransportStudents);

      // Fetch all driver attendance logs from localStorage
      const logs = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('erp_driver_attendance_')) {
          try {
            const driverData = JSON.parse(localStorage.getItem(key) || '[]');
            const driverId = key.split('erp_driver_attendance_')[1];
            // Find driver name from drivers array
            const driverObj = uniqueDrivers.find(d => d.driverId === driverId) || 
                             uniqueDrivers.find(d => d.name === driverId); // Fallback
            
            driverData.forEach(record => {
              logs.push({
                ...record,
                driverName: driverObj ? driverObj.name : driverId
              });
            });
          } catch (e) {
            console.error('Error parsing attendance', e);
          }
        }
      }
      // Sort by date descending
      logs.sort((a, b) => new Date(b.date) - new Date(a.date));
      setDriverAttendanceLogs(logs);
      
    } catch (error) {
      console.error('Failed to load transport data', error);
    }
  };

  React.useEffect(() => {
    fetchTransportData();

    // Listen for cross-tab storage changes to update attendance in real-time
    const handleStorage = (e) => {
      if (!e || !e.key || e.key.startsWith('erp_driver_attendance_')) {
        fetchTransportData();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const TABS = [
    { name: 'Dashboard', icon: <BarChart size={18} /> },
    { name: 'Routes & Vehicles', icon: <Navigation size={18} /> },
    { name: 'Drivers', icon: <UserCheck size={18} /> },
    { name: 'Student Allocation', icon: <Users size={18} /> },
    { name: 'Attendance', icon: <Clock size={18} /> },
    { name: 'Reports', icon: <FileText size={18} /> }
  ];

  return (
    <div className="dashboard-container animate-fade-in" style={{ padding: '2rem', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Premium Header Banner */}
      <div style={{
        background: 'var(--primary)',
        borderRadius: '16px',
        padding: '1.5rem 2rem',
        marginBottom: '1.5rem',
        color: '#fff',
        boxShadow: '0 4px 15px -5px rgba(59, 130, 246, 0.4)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative blur */}
        <div style={{ position: 'absolute', top: '-50%', right: '-10%', width: '300px', height: '300px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(40px)' }} />
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bus size={24} /> Advanced Transport Management
          </h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '0.875rem', fontWeight: 500 }}>
            Manage college fleets, routes, student allocations, and track buses in real-time.
          </p>
        </div>
      </div>

      <div className="transport-tabs">
        {TABS.map(tab => (
          <button
            key={tab.name}
            className={`transport-tab ${activeTab === tab.name ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.name)}
          >
            {tab.icon} {tab.name}
          </button>
        ))}
      </div>

      {activeTab === 'Dashboard' && (
        <div className="animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="glass-card p-6 border-t-4 border-blue-500 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
                  <Bus size={24} />
                </div>
                <div>
                  <h3 className="text-xs text-muted uppercase font-bold tracking-wider">Total Vehicles</h3>
                  <p className="text-2xl font-black mt-1">{routes.length} Buses</p>
                </div>
              </div>
            </div>
            <div className="glass-card p-6 border-t-4 border-indigo-500 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600">
                  <Navigation size={24} />
                </div>
                <div>
                  <h3 className="text-xs text-muted uppercase font-bold tracking-wider">Active Routes</h3>
                  <p className="text-2xl font-black mt-1">{routes.length} Routes</p>
                </div>
              </div>
            </div>
            <div className="glass-card p-6 border-t-4 border-green-500 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600">
                  <Users size={24} />
                </div>
                <div>
                  <h3 className="text-xs text-muted uppercase font-bold tracking-wider">Assigned Students</h3>
                  <p className="text-2xl font-black mt-1">{students.length}</p>
                </div>
              </div>
            </div>
            <div className="glass-card p-6 border-t-4 border-red-500 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600">
                  <CreditCard size={24} />
                </div>
                <div>
                  <h3 className="text-xs text-muted uppercase font-bold tracking-wider">Pending Fees</h3>
                  <p className="text-2xl font-black text-danger mt-1">₹ {students.filter(s=>s.feeStatus==='Pending').reduce((a,b)=>a+b.amount,0).toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="glass-card p-6">
              <h2 className="text-lg font-bold mb-4">Monthly Ridership Trends</h2>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={CHART_DATA}>
                  <defs>
                    <linearGradient id="colorRiders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.2} />
                  <XAxis dataKey="month" stroke="var(--text-muted)" />
                  <YAxis stroke="var(--text-muted)" />
                  <Tooltip contentStyle={{background:'var(--bg-secondary)', border:'none', borderRadius:'8px'}}/>
                  <Area type="monotone" dataKey="riders" stroke="#6366F1" fillOpacity={1} fill="url(#colorRiders)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="glass-card p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">Live Fleet Status</h2>
                <span className="text-xs font-bold text-success flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span> Live
                </span>
              </div>
              <div className="space-y-4">
                {routes.slice(0, 3).map(route => (
                  <div key={route.routeId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded text-blue-600">
                        <Bus size={20} />
                      </div>
                      <div>
                        <p className="font-bold">{route.name}</p>
                        <p className="text-xs text-muted">{route.vehicle} • {route.driver}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold px-2 py-1 bg-green-100 text-green-700 rounded-full">In Transit</span>
                      <p className="text-xs text-muted mt-1">{route.occupied}/{route.capacity} Seats</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Routes & Vehicles' && (
        <div className="animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Manage Bus Routes</h2>
            <button className="btn-primary flex items-center gap-2" onClick={() => setShowRouteModal(true)}><Plus size={16}/> Create Route</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {routes.map(route => (
              <div key={route.routeId} className="glass-card route-card relative">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 className="font-bold text-lg pr-4">{route.name}</h3>
                  <div className="text-xs font-bold text-primary bg-primary-light px-2 py-1 rounded" style={{ backgroundColor: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)' }}>
                    {route.routeId}
                  </div>
                </div>
                <div className="flex flex-col gap-1 text-sm text-muted mb-4">
                  <span className="flex items-center gap-2"><Bus size={14}/> {route.vehicle}</span>
                  <span className="flex items-center gap-2"><ShieldCheck size={14}/> {route.driver}</span>
                  <span className="flex items-center gap-2"><Users size={14}/> {route.occupied} / {route.capacity} Allocated</span>
                </div>
                <div className="route-points mt-2">
                  {route.points.map((point, idx) => (
                    <div key={idx} className="point-item text-muted">{point}</div>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <button className="flex-1 btn-secondary py-2 text-xs">Edit Points</button>
                  <button className="flex-1 btn-secondary py-2 text-xs">Change Bus</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'Student Allocation' && (
        <div className="animate-fade-in">
          <div className="glass-card">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
              <div className="search-box">
                <Search size={16} className="text-muted"/>
                <input type="text" placeholder="Search student or route..." value={search} onChange={e=>setSearch(e.target.value)}/>
              </div>
              <button className="btn-primary flex items-center gap-2" onClick={() => setShowAssignModal(true)}><Plus size={16}/> Assign Student</button>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>Name</th>
                    <th>Route Allocated</th>
                    <th>Pickup Point</th>
                    <th>Transport Fee</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(st => (
                    <tr key={st.studentId}>
                      <td className="font-mono text-sm">{st.studentId}</td>
                      <td className="font-medium">{st.name}</td>
                      <td><span className="bg-primary-light text-primary px-2 py-1 rounded text-xs font-bold">{st.routeId}</span></td>
                      <td>{st.pickupPoint}</td>
                      <td>
                        {st.feeStatus === 'Paid' ? (
                          <span className="text-success font-bold text-xs uppercase px-2 py-1 bg-green-100 rounded inline-block">Paid (₹{st.amount})</span>
                        ) : (
                          <span className="text-danger font-bold text-xs uppercase px-2 py-1 bg-red-100 rounded inline-block">Pending (₹{st.amount})</span>
                        )}
                      </td>
                      <td>
                        <button className="btn-secondary text-xs py-1 px-3">Re-allocate</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Drivers' && (
        <div className="animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Manage Transport Drivers</h2>
            <button className="btn-primary flex items-center gap-2" onClick={() => setShowDriverModal(true)}>
              <Plus size={16}/> Add Driver
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drivers.map(driver => (
            <div key={driver.driverId} className="glass-card p-6 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full mb-4 flex items-center justify-center text-gray-500">
                <UserCheck size={32} />
              </div>
              <h3 className="font-bold text-lg">{driver.name}</h3>
              <p className="text-muted text-sm mb-4">Exp: {driver.experience} • License: {driver.license}</p>
              <div className="w-full bg-gray-50 dark:bg-gray-800 p-3 rounded mb-4">
                <p className="text-xs text-muted">Contact: <span className="font-mono text-main">{driver.phone}</span></p>
              </div>
              <span className={`px-4 py-1 rounded-full text-xs font-bold uppercase ${driver.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {driver.status}
              </span>
            </div>
          ))}
          </div>
        </div>
      )}



      {activeTab === 'Attendance' && (
        <div className="animate-fade-in glass-card">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
            <h2 className="font-bold">Driver Attendance Logs</h2>
            <div className="search-box">
              <Search size={16} className="text-muted"/>
              <input type="text" placeholder="Search driver or date..." value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Driver Info</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {driverAttendanceLogs
                  .filter(log => (log.driverName || '').toLowerCase().includes(search.toLowerCase()) || log.date.includes(search))
                  .map((log, index) => (
                  <tr key={`${log.driverId}-${index}`}>
                    <td className="font-medium text-sm">
                      {new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td>
                      <div className="font-bold">{log.driverName}</div>
                      <div className="text-xs text-muted font-mono">{log.driverId}</div>
                    </td>
                    <td className="font-mono text-sm">{log.checkInTime || '-'}</td>
                    <td className="font-mono text-sm">{log.checkOutTime || '-'}</td>
                    <td>
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                        log.status === 'Present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {driverAttendanceLogs.length === 0 && (
                  <tr><td colSpan="5" className="text-center text-muted p-8">No attendance records found. Drivers can check in via their dashboard.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'Reports' && (
        <div className="animate-fade-in glass-card p-12 flex flex-col items-center text-center">
          <FileText size={48} className="text-muted opacity-50 mb-4"/>
          <h2 className="text-xl font-bold mb-2">Transport Reports Generator</h2>
          <p className="text-muted max-w-md mb-6">Export route-wise student lists, fee defaulter reports, and driver attendance logs to Excel.</p>
          <div className="flex gap-4">
            <button className="btn-primary flex items-center gap-2" onClick={handleViewManifest}><FileText size={16}/> View Student Manifest</button>
            <button className="btn-secondary flex items-center gap-2" onClick={handleViewDefaulters}><FileText size={16}/> View Defaulters List</button>
          </div>
        </div>
      )}

      {/* Report Preview Modal */}
      {reportModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-card" style={{ maxWidth: '1000px', width: '95vw', padding: '2rem' }}>
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-xl font-bold">{reportModal.title}</h2>
              <div className="flex items-center gap-3">
                <button 
                  className="btn-primary py-1 px-3 text-xs flex items-center gap-2"
                  onClick={() => downloadCSV(reportModal.filename, [reportModal.headers, ...reportModal.rows])}
                >
                  <Download size={14}/> Download CSV
                </button>
                <button className="text-muted hover:text-danger" onClick={() => setReportModal({ ...reportModal, isOpen: false })}>✕</button>
              </div>
            </div>
            
            <div className="table-container max-h-[60vh] overflow-auto" style={{ width: '100%' }}>
              <table style={{ minWidth: '800px' }}>
                <thead>
                  <tr>
                    {reportModal.headers.map((h, i) => (
                      <th key={i}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportModal.rows.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                  {reportModal.rows.length === 0 && (
                    <tr>
                      <td colSpan={reportModal.headers.length} className="text-center p-8 text-muted">
                        No records found for this report.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Assign Student Modal */}
      {showAssignModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Assign Student to Transport</h2>
              <button className="text-muted hover:text-danger" onClick={() => setShowAssignModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAssignStudent}>
              <div className="form-group">
                <label>Student ID (Roll No)</label>
                <input type="text" required placeholder="e.g., CS2022001" className="input-field" value={assignForm.studentId} onChange={e => setAssignForm({...assignForm, studentId: e.target.value})} />
              </div>
              <div className="form-group mt-3">
                <label>Student Name</label>
                <input type="text" required placeholder="e.g., John Doe" className="input-field" value={assignForm.name} onChange={e => setAssignForm({...assignForm, name: e.target.value})} />
              </div>
              <div className="form-group mt-3">
                <label>Route</label>
                <select className="input-field" required value={assignForm.routeId} onChange={e => setAssignForm({...assignForm, routeId: e.target.value})}>
                  <option value="">Select Route</option>
                  {routes.map(r => (
                    <option key={r.routeId} value={r.routeId}>{r.routeId} - {r.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group mt-3">
                <label>Pickup Point</label>
                <input type="text" required placeholder="e.g., City Mall" className="input-field" value={assignForm.pickupPoint} onChange={e => setAssignForm({...assignForm, pickupPoint: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="form-group">
                  <label>Fee Status</label>
                  <select className="input-field" value={assignForm.feeStatus} onChange={e => setAssignForm({...assignForm, feeStatus: e.target.value})}>
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Amount (₹)</label>
                  <input type="number" required placeholder="15000" className="input-field" value={assignForm.amount} onChange={e => setAssignForm({...assignForm, amount: e.target.value})} />
                </div>
              </div>
              <div className="flex gap-4 mt-6">
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowAssignModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary flex-1">Assign Student</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Route Modal */}
      {showRouteModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Create New Route</h2>
              <button className="text-muted hover:text-danger" onClick={() => setShowRouteModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateRoute}>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label>Route ID</label>
                  <input type="text" required placeholder="e.g., R-01" className="input-field" value={routeForm.routeId} onChange={e => setRouteForm({...routeForm, routeId: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Route Name</label>
                  <input type="text" required placeholder="e.g., North City" className="input-field" value={routeForm.name} onChange={e => setRouteForm({...routeForm, name: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="form-group">
                  <label>Vehicle (Bus No)</label>
                  <input type="text" required placeholder="e.g., TN 01 AB 1234" className="input-field" value={routeForm.vehicle} onChange={e => setRouteForm({...routeForm, vehicle: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Driver Name</label>
                  <select className="input-field" required value={routeForm.driver} onChange={e => setRouteForm({...routeForm, driver: e.target.value})}>
                    <option value="">Select Driver</option>
                    {drivers.filter(d => d.status === 'Active').map(d => (
                      <option key={d.driverId} value={d.name}>{d.name} ({d.driverId})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group mt-3">
                <label>Seating Capacity</label>
                <input type="number" required placeholder="50" className="input-field" value={routeForm.capacity} onChange={e => setRouteForm({...routeForm, capacity: e.target.value})} />
              </div>
              <div className="form-group mt-3">
                <label>Route Points (Comma separated)</label>
                <textarea required placeholder="Stop A, Stop B, Stop C" className="input-field" rows="3" value={routeForm.points} onChange={e => setRouteForm({...routeForm, points: e.target.value})}></textarea>
              </div>
              <div className="flex gap-4 mt-6">
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowRouteModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary flex-1">Create Route</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Driver Modal */}
      {showDriverModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Add New Driver</h2>
              <button className="text-muted hover:text-danger" onClick={() => setShowDriverModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddDriver}>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label>Driver ID</label>
                  <input type="text" required placeholder="e.g., D-101" className="input-field" value={driverForm.driverId} onChange={e => setDriverForm({...driverForm, driverId: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Driver Name</label>
                  <input type="text" required placeholder="e.g., Ramesh Kumar" className="input-field" value={driverForm.name} onChange={e => setDriverForm({...driverForm, name: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="form-group">
                  <label>Experience</label>
                  <input type="text" required placeholder="e.g., 5 Years" className="input-field" value={driverForm.experience} onChange={e => setDriverForm({...driverForm, experience: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>License No.</label>
                  <input type="text" required placeholder="e.g., TN-XX-XXXX" className="input-field" value={driverForm.license} onChange={e => setDriverForm({...driverForm, license: e.target.value})} />
                </div>
              </div>
              <div className="form-group mt-3">
                <label>Phone Number</label>
                <input type="text" required placeholder="e.g., +91 9876543210" className="input-field" value={driverForm.phone} onChange={e => setDriverForm({...driverForm, phone: e.target.value})} />
              </div>
              <div className="form-group mt-3">
                <label>Status</label>
                <select className="input-field" value={driverForm.status} onChange={e => setDriverForm({...driverForm, status: e.target.value})}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="flex gap-4 mt-6">
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowDriverModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary flex-1">Add Driver</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-4 right-4 z-50 animate-fade-in" style={{ animation: 'fade-in 0.3s ease-out' }}>
          <div className={`flex items-center gap-3 px-6 py-4 rounded-lg shadow-2xl text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span className="font-bold">{toast.message}</span>
          </div>
        </div>
      )}

    </div>
  );
};

export default TransportManagement;
