import React, { useState, useEffect } from 'react';
import {
  Bus, Users, Navigation, Plus, Search, Download, 
  CreditCard, UserCheck, ShieldCheck, FileText, BarChart, Clock,
  CheckCircle, AlertCircle, CheckSquare, Wrench
} from 'lucide-react';
import { 
  getTransportRoutes, createTransportRoute, updateTransportRoute, deleteTransportRoute,
  getTransportDrivers, createTransportDriver, updateTransportDriver, deleteTransportDriver,
  getTransportStudents, createTransportStudent, updateTransportStudent, deleteTransportStudent,
  getTransportVehicles, createTransportVehicle, updateTransportVehicle, deleteTransportVehicle,
  getStudents, getTransportMaintenance, createTransportMaintenance, 
  getTransportComplaints, createTransportComplaint 
} from '../../api/index';
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



const TransportManagement = ({ initialTab = 'Dashboard' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [search, setSearch] = useState('');
  const [routes, setRoutes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
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

  // Tasks, Maintenance & Complaints State
  const [maintenanceTasks, setMaintenanceTasks] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [maintForm, setMaintForm] = useState({
    vehicleNumber: '',
    serviceType: 'General',
    serviceDate: '',
    remarks: '',
    status: 'Scheduled'
  });
  const [complaintForm, setComplaintForm] = useState({
    studentId: '',
    name: '',
    busNumber: '',
    routeId: '',
    complaintType: 'General',
    description: '',
    assignedTo: ''
  });

  // Edit Points State
  const [showEditPointsModal, setShowEditPointsModal] = useState(false);
  const [editPointsRoute, setEditPointsRoute] = useState(null);
  const [editPointsValue, setEditPointsValue] = useState('');

  // Change Bus State
  const [showChangeBusModal, setShowChangeBusModal] = useState(false);
  const [changeBusRoute, setChangeBusRoute] = useState(null);
  const [changeBusForm, setChangeBusForm] = useState({ vehicle: '', driver: '' });

  // Create Route Modal State
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [driverForm, setDriverForm] = useState({
    driverId: '', name: '', experience: '', license: '', phone: '', status: 'Active', email: '', password: ''
  });

  const handleAddDriver = async (e) => {
    e.preventDefault();
    if (!driverForm.name || !driverForm.driverId) return;

    try {
      // Create via API so credentials are saved in the User collection
      const res = await createTransportDriver(driverForm);
      const newDriver = res.data;

      setDrivers(prev => {
        const updated = [newDriver, ...prev];
        localStorage.setItem(`erp_transport_drivers_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(updated));
        return updated;
      });
      showToast(`Successfully added driver ${driverForm.name} with login credentials`);
      setShowDriverModal(false);
      setDriverForm({ driverId: '', name: '', experience: '', license: '', phone: '', status: 'Active', email: '', password: '' });
    } catch (err) {
      console.error(err);
      // Fallback to local storage if API fails
      const newDriver = {
        _id: Date.now().toString(),
        ...driverForm
      };
      setDrivers(prev => {
        const updated = [newDriver, ...prev];
        localStorage.setItem(`erp_transport_drivers_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(updated));
        return updated;
      });
      showToast(`Successfully added driver ${driverForm.name} locally (API failed)`, 'warning');
      setShowDriverModal(false);
      setDriverForm({ driverId: '', name: '', experience: '', license: '', phone: '', status: 'Active', email: '', password: '' });
    }
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

  const handleCreateRoute = async (e) => {
    e.preventDefault();
    if (!routeForm.name || !routeForm.routeId) return;

    const newRoute = {
      routeId: routeForm.routeId,
      name: routeForm.name,
      vehicle: routeForm.vehicle,
      driver: routeForm.driver,
      capacity: Number(routeForm.capacity) || 50,
      occupied: 0,
      points: routeForm.points.split(',').map(p => p.trim()).filter(Boolean)
    };

    try {
      const res = await createTransportRoute(newRoute);
      const savedRoute = res.data || newRoute;
      setRoutes(prev => {
        const filtered = prev.filter(r => r.routeId !== savedRoute.routeId);
        const updated = [savedRoute, ...filtered];
        localStorage.setItem(`erp_transport_routes_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(updated));
        return updated;
      });
      showToast(`Successfully created route ${routeForm.name}`);
    } catch (err) {
      console.error('API create route failed, saving locally:', err);
      const localRoute = { _id: Date.now().toString(), ...newRoute };
      setRoutes(prev => {
        const updated = [localRoute, ...prev];
        localStorage.setItem(`erp_transport_routes_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(updated));
        return updated;
      });
      showToast(`Created route ${routeForm.name} locally`);
    }

    setShowRouteModal(false);
    setRouteForm({ routeId: '', name: '', vehicle: '', driver: '', capacity: 50, points: '' });
  };

  const handleOpenEditPoints = (route) => {
    setEditPointsRoute(route);
    setEditPointsValue(route.points ? route.points.join(', ') : '');
    setShowEditPointsModal(true);
  };

  const handleSavePoints = async (e) => {
    e.preventDefault();
    if (!editPointsRoute) return;

    const updatedPoints = editPointsValue
      .split(',')
      .map(p => p.trim())
      .filter(Boolean);

    try {
      if (editPointsRoute._id && !editPointsRoute._id.startsWith('mock-') && editPointsRoute._id.length > 10) {
        await updateTransportRoute(editPointsRoute._id, { points: updatedPoints });
      } else {
        await createTransportRoute({ ...editPointsRoute, points: updatedPoints });
      }
    } catch (err) {
      console.warn('Backend update points failed, persisting locally', err);
    }

    setRoutes(prev => {
      const updated = prev.map(r => 
        r.routeId === editPointsRoute.routeId ? { ...r, points: updatedPoints } : r
      );
      localStorage.setItem(`erp_transport_routes_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(updated));
      return updated;
    });

    showToast(`Successfully updated points for route ${editPointsRoute.name}`);
    setShowEditPointsModal(false);
    setEditPointsRoute(null);
  };

  const handleOpenChangeBus = (route) => {
    setChangeBusRoute(route);
    setChangeBusForm({
      vehicle: route.vehicle || '',
      driver: route.driver || ''
    });
    setShowChangeBusModal(true);
  };

  const handleSaveBus = async (e) => {
    e.preventDefault();
    if (!changeBusRoute) return;

    try {
      if (changeBusRoute._id && !changeBusRoute._id.startsWith('mock-') && changeBusRoute._id.length > 10) {
        await updateTransportRoute(changeBusRoute._id, { vehicle: changeBusForm.vehicle, driver: changeBusForm.driver });
      } else {
        await createTransportRoute({ ...changeBusRoute, vehicle: changeBusForm.vehicle, driver: changeBusForm.driver });
      }
    } catch (err) {
      console.warn('Backend update bus/driver failed, persisting locally', err);
    }

    setRoutes(prev => {
      const updated = prev.map(r => 
        r.routeId === changeBusRoute.routeId ? { ...r, vehicle: changeBusForm.vehicle, driver: changeBusForm.driver } : r
      );
      localStorage.setItem(`erp_transport_routes_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(updated));
      return updated;
    });

    showToast(`Successfully updated vehicle and driver for route ${changeBusRoute.name}`);
    setShowChangeBusModal(false);
    setChangeBusRoute(null);
  };

  const handleAssignStudent = async (e) => {
    e.preventDefault();
    if (!assignForm.studentId || !assignForm.routeId) return;

    const newStudent = {
      studentId: assignForm.studentId,
      name: assignForm.name || 'Unknown Student',
      routeId: assignForm.routeId,
      pickupPoint: assignForm.pickupPoint,
      feeStatus: assignForm.feeStatus,
      amount: Number(assignForm.amount) || 0
    };

    try {
      const res = await createTransportStudent(newStudent);
      const savedStudent = res.data || { _id: Date.now().toString(), ...newStudent };
      
      const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';
      const storageKey = `erp_transport_students_${tenantId}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const filtered = existing.filter(s => s.studentId !== savedStudent.studentId);
      localStorage.setItem(storageKey, JSON.stringify([savedStudent, ...filtered]));

      setStudents(prev => {
        const filteredPrev = prev.filter(s => s.studentId !== savedStudent.studentId);
        return [savedStudent, ...filteredPrev];
      });
      showToast(`Successfully assigned ${assignForm.studentId} to route ${assignForm.routeId}`);
    } catch (err) {
      console.error('API create student failed, saving locally:', err);
      const localStudent = { _id: Date.now().toString(), ...newStudent };
      const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';
      const storageKey = `erp_transport_students_${tenantId}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const filtered = existing.filter(s => s.studentId !== localStudent.studentId);
      localStorage.setItem(storageKey, JSON.stringify([localStudent, ...filtered]));

      setStudents(prev => {
        const filteredPrev = prev.filter(s => s.studentId !== localStudent.studentId);
        return [localStudent, ...filteredPrev];
      });
      showToast(`Assigned ${assignForm.studentId} to route ${assignForm.routeId} locally`);
    }

    setShowAssignModal(false);
    setAssignForm({ studentId: '', name: '', routeId: '', pickupPoint: '', feeStatus: 'Pending', amount: '' });
  };

  const handleOpenReallocate = (student) => {
    setAssignForm({
      studentId: student.studentId,
      name: student.name,
      routeId: student.routeId || '',
      pickupPoint: student.pickupPoint || '',
      feeStatus: student.feeStatus || 'Pending',
      amount: student.amount || ''
    });
    setShowAssignModal(true);
  };

  const handleCreateMaintenance = async (e) => {
    e.preventDefault();
    if (!maintForm.vehicleNumber || !maintForm.serviceDate) return;

    const payload = {
      _id: 'maint_' + Date.now().toString(),
      vehicleNumber: maintForm.vehicleNumber,
      serviceType: maintForm.serviceType,
      serviceDate: maintForm.serviceDate,
      remarks: maintForm.remarks,
      status: maintForm.status
    };

    // Save to server
    try {
      await createTransportMaintenance(payload);
    } catch (err) {
      console.warn('Backend failed, falling back to local storage', err);
    }

    // Save to local storage
    const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';
    const key = `erp_transport_maintenance_${tenantId}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    localStorage.setItem(key, JSON.stringify([payload, ...existing]));

    showToast(`Successfully scheduled maintenance for vehicle ${maintForm.vehicleNumber}`);
    setShowMaintModal(false);
    setMaintForm({ vehicleNumber: '', serviceType: 'General', serviceDate: '', remarks: '', status: 'Scheduled' });
    fetchTransportData();
  };

  const handleCreateComplaint = async (e) => {
    e.preventDefault();
    if (!complaintForm.studentId || !complaintForm.description) return;

    const payload = {
      _id: 'comp_' + Date.now().toString(),
      complaintId: `COMP-${Date.now().toString().slice(-6)}`,
      studentId: complaintForm.studentId,
      name: complaintForm.name || 'Unknown Student',
      busNumber: complaintForm.busNumber,
      routeId: complaintForm.routeId,
      complaintType: complaintForm.complaintType,
      description: complaintForm.description,
      assignedTo: complaintForm.assignedTo,
      status: 'Pending',
      reporterType: 'Student'
    };

    // Save to server
    try {
      await createTransportComplaint(payload);
    } catch (err) {
      console.warn('Backend failed, falling back to local storage', err);
    }

    // Save to local storage
    const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';
    const key = `erp_transport_complaints_${tenantId}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    localStorage.setItem(key, JSON.stringify([payload, ...existing]));

    showToast(`Successfully assigned task/complaint for student ${complaintForm.studentId}`);
    setShowComplaintModal(false);
    setComplaintForm({ studentId: '', name: '', busNumber: '', routeId: '', complaintType: 'General', description: '', assignedTo: '' });
    fetchTransportData();
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
      const [routesRes, driversRes, studentsRes, vehiclesRes, allStudentsRes] = await Promise.all([
        getTransportRoutes(),
        getTransportDrivers(),
        getTransportStudents(),
        getTransportVehicles(),
        getStudents().catch(() => ({ data: [] }))
      ]);
      const localRoutes = JSON.parse(localStorage.getItem(`erp_transport_routes_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`) || '[]');
      const combinedRoutes = [...routesRes.data, ...localRoutes];
      const uniqueRoutes = Array.from(new Map(combinedRoutes.map(item => [item.routeId, item])).values());
      setRoutes(uniqueRoutes);

      setVehicles(vehiclesRes.data || []);

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

      // Fetch maintenance and complaints
      const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';
      const [maintRes, compRes] = await Promise.all([
        getTransportMaintenance().catch(() => ({ data: [] })),
        getTransportComplaints().catch(() => ({ data: [] }))
      ]);

      const localMaintenance = JSON.parse(localStorage.getItem(`erp_transport_maintenance_${tenantId}`) || '[]');
      const combinedMaintenance = [...(maintRes.data || []), ...localMaintenance];
      const uniqueMaintenance = Array.from(new Map(combinedMaintenance.map(item => [item._id, item])).values());
      setMaintenanceTasks(uniqueMaintenance);

      const localComplaints = JSON.parse(localStorage.getItem(`erp_transport_complaints_${tenantId}`) || '[]');
      const combinedComplaints = [...(compRes.data || []), ...localComplaints];
      const uniqueComplaints = Array.from(new Map(combinedComplaints.map(item => [item._id, item])).values());
      setComplaints(uniqueComplaints);
      
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
    { name: 'Tasks & Maintenance', icon: <Wrench size={18} /> },
    { name: 'Attendance', icon: <Clock size={18} /> },
    { name: 'Reports', icon: <FileText size={18} /> }
  ];

  return (
    <div className="tm-erp-container">
      {/* Premium Header Banner */}
      <div className="tm-erp-header">
        <div className="tm-header-left">
          <div className="tm-title-row">
            <h1 className="tm-page-title"><Bus size={28} className="text-primary" /> Advanced Transport Management</h1>
            <div className="tm-live-badge">
              <span className="tm-pulse-dot"></span> Live Fleet Sync
            </div>
          </div>
          <p className="tm-page-subtitle">
            Manage college fleets, routes, student allocations, and track buses in real-time.
          </p>
        </div>
      </div>

      <div className="tm-erp-tabs">
        {TABS.map(tab => (
          <button
            key={tab.name}
            className={`tm-tab-btn ${activeTab === tab.name ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.name)}
          >
            {tab.icon} {tab.name}
          </button>
        ))}
      </div>

      {activeTab === 'Dashboard' && (
        <div className="animate-fade-in">
          <div className="tm-kpi-grid mb-6">
            <div className="tm-kpi-card blue">
              <div className="tm-kpi-header">
                <h3 className="tm-kpi-label">Total Vehicles</h3>
                <div className="tm-icon-box"><Bus size={20} /></div>
              </div>
              <p className="tm-kpi-value">{vehicles.length} Vehicles</p>
            </div>
            <div className="tm-kpi-card indigo">
              <div className="tm-kpi-header">
                <h3 className="tm-kpi-label">Active Routes</h3>
                <div className="tm-icon-box"><Navigation size={20} /></div>
              </div>
              <p className="tm-kpi-value">{routes.length} Routes</p>
            </div>
            <div className="tm-kpi-card green">
              <div className="tm-kpi-header">
                <h3 className="tm-kpi-label">Assigned Students</h3>
                <div className="tm-icon-box"><Users size={20} /></div>
              </div>
              <p className="tm-kpi-value">{students.length}</p>
            </div>
            <div className="tm-kpi-card red">
              <div className="tm-kpi-header">
                <h3 className="tm-kpi-label">Pending Fees</h3>
                <div className="tm-icon-box"><CreditCard size={20} /></div>
              </div>
              <p className="tm-kpi-value tm-text-danger">₹ {students.filter(s=>s.feeStatus==='Pending').reduce((a,b)=>a+b.amount,0).toLocaleString('en-IN')}</p>
            </div>
          </div>

          <div className="transport-charts-grid mt-6">
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
                  <div key={route.routeId} className="transport-fleet-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="transport-fleet-icon-wrapper">
                        <Bus size={20} />
                      </div>
                      <div>
                        <p style={{ fontWeight: '700', margin: 0, fontSize: '0.95rem' }}>{route.name}</p>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{route.vehicle} • {route.driver}</p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="transport-status-badge success">In Transit</span>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{route.occupied}/{route.capacity} Seats</p>
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
            <button className="tm-btn tm-btn-primary" onClick={() => setShowRouteModal(true)}><Plus size={16}/> Create Route</button>
          </div>
          <div className="tm-routes-grid">
            {routes.map(route => (
              <div key={route.routeId} className="tm-route-card">
                <div className="tm-route-header">
                  <h3 className="tm-route-title">{route.name}</h3>
                  <div className="tm-badge tm-badge-route">
                    {route.routeId}
                  </div>
                </div>
                <div className="tm-route-meta">
                  <span className="tm-route-meta-item"><Bus size={14}/> {route.vehicle}</span>
                  <span className="tm-route-meta-item"><ShieldCheck size={14}/> {route.driver}</span>
                  <span className="tm-route-meta-item"><Users size={14}/> {route.occupied} / {route.capacity} Allocated</span>
                </div>
                <div className="tm-route-points">
                  {route.points.map((point, idx) => (
                    <div key={idx} className="tm-point-tag">{point}</div>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <button className="flex-1 tm-btn tm-btn-secondary py-2 text-xs" onClick={() => handleOpenEditPoints(route)}>Edit Points</button>
                  <button className="flex-1 tm-btn tm-btn-secondary py-2 text-xs" onClick={() => handleOpenChangeBus(route)}>Change Bus</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'Student Allocation' && (
        <div className="animate-fade-in">
          <div className="tm-panel">
            <div className="tm-panel-header">
              <div className="tm-search-box">
                <Search size={16} />
                <input type="text" className="tm-input" placeholder="Search student or route..." value={search} onChange={e=>setSearch(e.target.value)}/>
              </div>
              <button className="tm-btn tm-btn-primary" onClick={() => setShowAssignModal(true)}><Plus size={16}/> Assign Student</button>
            </div>
            <div className="tm-table-container">
              <table className="tm-table">
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
                        <button className="btn-secondary text-xs py-1 px-3" onClick={() => handleOpenReallocate(st)}>Re-allocate</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Tasks & Maintenance' && (
        <div className="animate-fade-in flex flex-col gap-6">
          {/* Maintenance Section */}
          <div className="tm-panel">
            <div className="tm-panel-header">
              <h3 className="tm-panel-title">
                <Wrench size={18} className="text-primary"/> Vehicle Maintenance Schedules
              </h3>
              <button className="tm-btn tm-btn-primary" onClick={() => setShowMaintModal(true)}>
                <Plus size={14}/> Schedule Maintenance
              </button>
            </div>
            <div className="tm-table-container">
              <table className="tm-table">
                <thead>
                  <tr>
                    <th>Vehicle Number</th>
                    <th>Service Type</th>
                    <th>Scheduled Date</th>
                    <th>Status</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenanceTasks.map(task => (
                    <tr key={task._id}>
                      <td className="font-mono font-medium">{task.vehicleNumber}</td>
                      <td>{task.serviceType}</td>
                      <td>{new Date(task.serviceDate).toLocaleDateString()}</td>
                      <td>
                        <span className={`tm-badge ${
                          task.status === 'Completed' ? 'tm-badge-paid' :
                          task.status === 'In Progress' ? 'tm-badge-route' : 'tm-badge-pending'
                        }`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="text-muted text-sm">{task.remarks || 'No remarks'}</td>
                    </tr>
                  ))}
                  {maintenanceTasks.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center p-8 text-muted">No maintenance tasks scheduled.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Complaints / Tasks Section */}
          <div className="tm-panel">
            <div className="tm-panel-header">
              <h3 className="tm-panel-title">
                <CheckSquare size={18} className="text-primary"/> Driver Tasks & Student Complaints
              </h3>
              <button className="tm-btn tm-btn-primary" onClick={() => setShowComplaintModal(true)}>
                <Plus size={14}/> Assign Driver Task
              </button>
            </div>
            <div className="tm-table-container">
              <table className="tm-table">
                <thead>
                  <tr>
                    <th>Complaint ID</th>
                    <th>Student ID</th>
                    <th>Name</th>
                    <th>Bus / Route</th>
                    <th>Task/Complaint Type</th>
                    <th>Description</th>
                    <th>Assigned To</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map(comp => (
                    <tr key={comp._id}>
                      <td className="font-mono text-xs">{comp.complaintId}</td>
                      <td className="font-mono text-sm">{comp.studentId}</td>
                      <td className="font-medium">{comp.name}</td>
                      <td>
                        <span className="tm-badge bg-gray-100 text-gray-700 mr-1">Bus: {comp.busNumber || 'N/A'}</span>
                        <span className="tm-badge tm-badge-route">Route: {comp.routeId || 'N/A'}</span>
                      </td>
                      <td className="font-bold text-xs">{comp.complaintType}</td>
                      <td className="text-sm max-w-xs truncate" title={comp.description}>{comp.description}</td>
                      <td><span className="font-medium tm-text-primary">{comp.assignedTo || 'Unassigned'}</span></td>
                      <td>
                        <span className={`tm-badge ${
                          comp.status === 'Resolved' ? 'tm-badge-paid' :
                          comp.status === 'In Progress' ? 'tm-badge-route' : 'tm-badge-pending'
                        }`}>
                          {comp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {complaints.length === 0 && (
                    <tr>
                      <td colSpan="8" className="text-center p-8 text-muted">No driver tasks or complaints logged.</td>
                    </tr>
                  )}
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
            <button className="tm-btn tm-btn-primary" onClick={() => setShowDriverModal(true)}>
              <Plus size={16}/> Add Driver
            </button>
          </div>
          <div className="tm-routes-grid">
          {drivers.map(driver => (
            <div key={driver.driverId} className="tm-route-card flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full mb-4 flex items-center justify-center text-gray-500">
                <UserCheck size={32} />
              </div>
              <h3 className="tm-route-title">{driver.name}</h3>
              <p className="tm-route-meta text-sm mb-2">Exp: {driver.experience} • License: {driver.license}</p>
              <div className="w-full bg-gray-50 dark:bg-gray-800 p-3 rounded mb-4">
                <p className="text-xs text-muted">Contact: <span className="font-mono tm-text-primary">{driver.phone}</span></p>
              </div>
              <span className={`tm-badge ${driver.status === 'Active' ? 'tm-badge-paid' : 'tm-badge-pending'}`}>
                {driver.status}
              </span>
            </div>
          ))}
          </div>
        </div>
      )}



      {activeTab === 'Attendance' && (
        <div className="animate-fade-in tm-panel">
          <div className="tm-panel-header">
            <h2 className="tm-panel-title">Driver Attendance Logs</h2>
            <div className="tm-search-box">
              <Search size={16} />
              <input type="text" className="tm-input" placeholder="Search driver or date..." value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
          </div>
          <div className="tm-table-container">
            <table className="tm-table">
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
                      <span className={`tm-badge ${
                        log.status === 'Present' ? 'tm-badge-paid' : 'tm-badge-pending'
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
        <div className="animate-fade-in tm-panel p-12 flex flex-col items-center text-center">
          <FileText size={48} className="text-muted opacity-50 mb-4"/>
          <h2 className="text-xl font-bold mb-2">Transport Reports Generator</h2>
          <p className="text-muted max-w-md mb-6">Export route-wise student lists, fee defaulter reports, and driver attendance logs to Excel.</p>
          <div className="flex gap-4">
            <button className="tm-btn tm-btn-primary" onClick={handleViewManifest}><FileText size={16}/> View Student Manifest</button>
            <button className="tm-btn tm-btn-secondary" onClick={handleViewDefaulters}><FileText size={16}/> View Defaulters List</button>
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
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="form-group">
                  <label>Email (for Login)</label>
                  <input type="email" required placeholder="e.g., driver@college.edu" className="input-field" value={driverForm.email} onChange={e => setDriverForm({...driverForm, email: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input type="password" required placeholder="Enter password" className="input-field" value={driverForm.password} onChange={e => setDriverForm({...driverForm, password: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="form-group">
                  <label>Phone Number</label>
                  <input type="text" required placeholder="e.g., +91 9876543210" className="input-field" value={driverForm.phone} onChange={e => setDriverForm({...driverForm, phone: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select className="input-field" value={driverForm.status} onChange={e => setDriverForm({...driverForm, status: e.target.value})}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-4 mt-6">
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowDriverModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary flex-1">Add Driver</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Points Modal */}
      {showEditPointsModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Edit Route Points</h2>
              <button className="text-muted hover:text-danger" onClick={() => setShowEditPointsModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSavePoints}>
              <div className="form-group">
                <label>Route Points (Comma separated)</label>
                <textarea 
                  required 
                  placeholder="Stop A, Stop B, Stop C" 
                  className="input-field" 
                  rows="5" 
                  value={editPointsValue} 
                  onChange={e => setEditPointsValue(e.target.value)}
                />
              </div>
              <div className="flex gap-4 mt-6">
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowEditPointsModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary flex-1">Save Points</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Bus Modal */}
      {showChangeBusModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Change Vehicle & Driver</h2>
              <button className="text-muted hover:text-danger" onClick={() => setShowChangeBusModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveBus}>
              <div className="form-group">
                <label>Vehicle (Bus No)</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g., TN 01 AB 1234" 
                  className="input-field" 
                  value={changeBusForm.vehicle} 
                  onChange={e => setChangeBusForm({...changeBusForm, vehicle: e.target.value})} 
                />
              </div>
              <div className="form-group mt-3">
                <label>Driver Name</label>
                <select 
                  className="input-field" 
                  required 
                  value={changeBusForm.driver} 
                  onChange={e => setChangeBusForm({...changeBusForm, driver: e.target.value})}
                >
                  <option value="">Select Driver</option>
                  {drivers.filter(d => d.status === 'Active').map(d => (
                    <option key={d.driverId} value={d.name}>{d.name} ({d.driverId})</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-4 mt-6">
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowChangeBusModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary flex-1">Save Changes</button>
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

      {/* Schedule Maintenance Modal */}
      {showMaintModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Schedule Vehicle Maintenance</h2>
              <button className="text-muted hover:text-danger" onClick={() => setShowMaintModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateMaintenance}>
              <div className="form-group">
                <label>Vehicle (Bus) Number</label>
                <select className="input-field" required value={maintForm.vehicleNumber} onChange={e => setMaintForm({...maintForm, vehicleNumber: e.target.value})}>
                  <option value="">Select Vehicle</option>
                  {routes.map(r => (
                    <option key={r.routeId} value={r.vehicle}>{r.vehicle} (Route {r.routeId})</option>
                  ))}
                </select>
              </div>
              <div className="form-group mt-3">
                <label>Service Type</label>
                <select className="input-field" value={maintForm.serviceType} onChange={e => setMaintForm({...maintForm, serviceType: e.target.value})}>
                  <option value="General">General Service</option>
                  <option value="Oil Change">Oil Change</option>
                  <option value="Brake Service">Brake Service</option>
                  <option value="Tire Replacement">Tire Replacement</option>
                  <option value="Engine Repair">Engine Repair</option>
                </select>
              </div>
              <div className="form-group mt-3">
                <label>Service Date</label>
                <input type="date" required className="input-field" value={maintForm.serviceDate} onChange={e => setMaintForm({...maintForm, serviceDate: e.target.value})} />
              </div>
              <div className="form-group mt-3">
                <label>Remarks / Instructions</label>
                <textarea rows="3" className="input-field" placeholder="e.g. Driver reported steering tightness..." value={maintForm.remarks} onChange={e => setMaintForm({...maintForm, remarks: e.target.value})}></textarea>
              </div>
              <div className="flex gap-4 mt-6">
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowMaintModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary flex-1">Schedule Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Complaint / Task Modal */}
      {showComplaintModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Assign Task / Complaint to Driver</h2>
              <button className="text-muted hover:text-danger" onClick={() => setShowComplaintModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateComplaint}>
              <div className="form-group">
                <label>Student ID (Reporter/Related)</label>
                <select className="input-field" required value={complaintForm.studentId} onChange={e => {
                  const selectedSt = students.find(s => s.studentId === e.target.value);
                  setComplaintForm({
                    ...complaintForm,
                    studentId: e.target.value,
                    name: selectedSt ? selectedSt.name : '',
                    busNumber: selectedSt ? routes.find(r => r.routeId === selectedSt.routeId)?.vehicle || '' : '',
                    routeId: selectedSt ? selectedSt.routeId : ''
                  });
                }}>
                  <option value="">Select Student</option>
                  {students.map(s => (
                    <option key={s.studentId} value={s.studentId}>{s.name} ({s.studentId})</option>
                  ))}
                </select>
              </div>
              <div className="form-group mt-3">
                <label>Student Name</label>
                <input type="text" readOnly className="input-field bg-gray-100 dark:bg-gray-800" value={complaintForm.name} />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="form-group">
                  <label>Bus Number</label>
                  <input type="text" readOnly className="input-field bg-gray-100 dark:bg-gray-800" value={complaintForm.busNumber} />
                </div>
                <div className="form-group">
                  <label>Route ID</label>
                  <input type="text" readOnly className="input-field bg-gray-100 dark:bg-gray-800" value={complaintForm.routeId} />
                </div>
              </div>
              <div className="form-group mt-3">
                <label>Driver Assignment</label>
                <select className="input-field" required value={complaintForm.assignedTo} onChange={e => setComplaintForm({...complaintForm, assignedTo: e.target.value})}>
                  <option value="">Select Driver</option>
                  {drivers.map(d => (
                    <option key={d.driverId} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group mt-3">
                <label>Complaint/Task Category</label>
                <select className="input-field" value={complaintForm.complaintType} onChange={e => setComplaintForm({...complaintForm, complaintType: e.target.value})}>
                  <option value="General">General Assistance</option>
                  <option value="Route Delay">Route Delay Issue</option>
                  <option value="Student Behavior">Student Behavior Incident</option>
                  <option value="Maintenance Request">Maintenance Request</option>
                  <option value="Lost Item">Lost Item Inquiry</option>
                </select>
              </div>
              <div className="form-group mt-3">
                <label>Description / Details</label>
                <textarea rows="3" required className="input-field" placeholder="Provide detailed instructions or complaint details..." value={complaintForm.description} onChange={e => setComplaintForm({...complaintForm, description: e.target.value})}></textarea>
              </div>
              <div className="flex gap-4 mt-6">
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowComplaintModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary flex-1">Assign Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default TransportManagement;



