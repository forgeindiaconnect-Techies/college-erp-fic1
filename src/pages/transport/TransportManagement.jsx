import React, { useState, useEffect } from 'react';
import {
  Bus, Users, Navigation, Plus, Search, Download, 
  CreditCard, UserCheck, ShieldCheck, FileText, BarChart, Clock,
  CheckCircle, AlertCircle, Wrench, Edit2, Trash2, Phone,
  CheckCircle2, ArrowRight, LayoutGrid, Calendar, Activity, ShieldAlert
} from 'lucide-react';
import { 
  getTransportRoutes, createTransportRoute, updateTransportRoute, deleteTransportRoute,
  getTransportDrivers, createTransportDriver, updateTransportDriver, deleteTransportDriver,
  getTransportStudents, createTransportStudent, updateTransportStudent, deleteTransportStudent,
  getTransportVehicles, createTransportVehicle, updateTransportVehicle, deleteTransportVehicle,
  getStudents, getTransportMaintenance, createTransportMaintenance, 
  getTransportComplaints, createTransportComplaint,
  getDriverAttendance, getUsers
} from '../../api/index';
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area
} from 'recharts';
import './TransportManagement.css';

const CHART_DATA = [
  { month: 'Jul', riders: 320 }, { month: 'Aug', riders: 380 },
  { month: 'Sep', riders: 410 }, { month: 'Oct', riders: 405 },
  { month: 'Nov', riders: 425 }, { month: 'Dec', riders: 440 },
];

const AVATAR_GRADIENTS = [
  'bg-gradient-blue', 'bg-gradient-purple', 'bg-gradient-green', 
  'bg-gradient-orange', 'bg-gradient-teal', 'bg-gradient-indigo'
];

const getAvatarColor = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
};

const getInitials = (name = '') => {
  if (!name) return 'TR';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

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
    rows: [],
    filename: 'Transport_Report.csv'
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

  // Add Driver Modal State
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [driverForm, setDriverForm] = useState({
    driverId: '', name: '', experience: '', license: '', phone: '', status: 'Active', email: '', password: ''
  });

  // Create Route Modal State
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [routeForm, setRouteForm] = useState({
    routeId: '',
    name: '',
    vehicle: '',
    driver: '',
    capacity: 50,
    points: ''
  });

  const handleAddDriver = async (e) => {
    e.preventDefault();
    if (!driverForm.name || !driverForm.driverId) return;

    try {
      const res = await createTransportDriver(driverForm);
      const newDriver = res.data || driverForm;

      setDrivers(prev => {
        const updated = [newDriver, ...prev.filter(d => d.driverId !== newDriver.driverId)];
        localStorage.setItem(`erp_transport_drivers_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(updated));
        return updated;
      });
      showToast(`Successfully added driver ${driverForm.name}`);
      setShowDriverModal(false);
      setDriverForm({ driverId: '', name: '', experience: '', license: '', phone: '', status: 'Active', email: '', password: '' });
      fetchTransportData();
    } catch (err) {
      console.error(err);
      const newDriver = { _id: Date.now().toString(), ...driverForm };
      setDrivers(prev => {
        const updated = [newDriver, ...prev];
        localStorage.setItem(`erp_transport_drivers_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(updated));
        return updated;
      });
      showToast(`Successfully added driver ${driverForm.name} locally`);
      setShowDriverModal(false);
      setDriverForm({ driverId: '', name: '', experience: '', license: '', phone: '', status: 'Active', email: '', password: '' });
    }
  };

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

    showToast(`Successfully updated route points for ${editPointsRoute.name}`);
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

    showToast(`Successfully updated vehicle & driver for route ${changeBusRoute.name}`);
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
      showToast(`Successfully assigned ${assignForm.name} (${assignForm.studentId}) to route ${assignForm.routeId}`);
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

    try {
      await createTransportMaintenance(payload);
    } catch (err) {
      console.warn('Backend failed, falling back to local storage', err);
    }

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

    try {
      await createTransportComplaint(payload);
    } catch (err) {
      console.warn('Backend failed, falling back to local storage', err);
    }

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
      title: "Transport Student Allocation Manifest",
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
      title: "Transport Fee Defaulters Ledger",
      headers,
      rows,
      filename: "Transport_Fee_Defaulters.csv"
    });
  };

  const fetchTransportData = async () => {
    try {
      const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';
      const [routesRes, driversRes, studentsRes, vehiclesRes, allStudentsRes, attRes, usersRes] = await Promise.all([
        getTransportRoutes().catch(() => ({ data: [] })),
        getTransportDrivers().catch(() => ({ data: [] })),
        getTransportStudents().catch(() => ({ data: [] })),
        getTransportVehicles().catch(() => ({ data: [] })),
        getStudents().catch(() => ({ data: [] })),
        getDriverAttendance().catch(() => ({ data: [] })),
        getUsers().catch(() => ({ data: [] }))
      ]);

      const localRoutes = JSON.parse(localStorage.getItem(`erp_transport_routes_${tenantId}`) || '[]');
      const combinedRoutes = [...(routesRes.data || []), ...localRoutes];
      const uniqueRoutes = Array.from(new Map(combinedRoutes.map(item => [item.routeId, item])).values());
      setRoutes(uniqueRoutes);

      setVehicles(vehiclesRes.data || []);

      const localDrivers = JSON.parse(localStorage.getItem(`erp_transport_drivers_${tenantId}`) || '[]');
      const allUsers = usersRes.data || [];
      const driverUsers = allUsers.filter(u => (u.role || '').toLowerCase() === 'driver').map(u => ({
        _id: u._id,
        driverId: u.referenceId || `DRV-${(u._id || '').slice(-4).toUpperCase()}`,
        name: u.name,
        email: u.email,
        phone: u.phone || u.mobile || '',
        status: 'Active'
      }));

      const combinedDrivers = [...(driversRes.data || []), ...localDrivers, ...driverUsers];
      const uniqueDriversMap = new Map();
      combinedDrivers.forEach(d => {
        const key = d.driverId || d._id || d.name;
        if (key && !uniqueDriversMap.has(key)) {
          uniqueDriversMap.set(key, d);
        }
      });
      const uniqueDrivers = Array.from(uniqueDriversMap.values());
      setDrivers(uniqueDrivers);
      
      let combinedTransportStudents = [...(studentsRes.data || [])];

      // Merge from main students database
      const erpStudents = JSON.parse(localStorage.getItem(`erp_students_${tenantId}`) || '[]');
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

      // Helper function to resolve driver details
      const cleanStr = (str) => (str || '').toString().trim().toLowerCase();
      const findDriver = (id) => {
        if (!id) return null;
        const target = cleanStr(id);
        return uniqueDrivers.find(d => 
          cleanStr(d._id) === target ||
          cleanStr(d.driverId) === target ||
          cleanStr(d.referenceId) === target ||
          cleanStr(d.id) === target ||
          cleanStr(d.name) === target ||
          cleanStr(d.email) === target ||
          (d.phone && cleanStr(d.phone).replace(/\s+/g, '') === target.replace(/\s+/g, ''))
        ) || allUsers.find(u => 
          cleanStr(u._id) === target ||
          cleanStr(u.referenceId) === target ||
          cleanStr(u.name) === target ||
          cleanStr(u.email) === target
        );
      };

      // Process Driver Attendance Logs (from API & localStorage)
      const logs = [];
      const seenKeys = new Set();

      // 1. Process API attendance logs
      const apiRecords = Array.isArray(attRes.data) ? attRes.data : [];
      apiRecords.forEach(record => {
        const rawId = record.driverId || '';
        const driverObj = findDriver(rawId) || findDriver(record.driverName);
        const assignedRoute = uniqueRoutes.find(r => r.driver && driverObj && cleanStr(r.driver).includes(cleanStr(driverObj.name)));
        const isHexId = /^[0-9a-fA-F]{24}$/.test(rawId);
        
        let driverName = record.driverName;
        if (!driverName || isHexId || /^[0-9a-fA-F]{24}$/.test(driverName)) {
          driverName = driverObj?.name || (uniqueDrivers.length > 0 ? uniqueDrivers[0].name : 'Bus Driver');
        }

        const displayDriverId = driverObj?.driverId || driverObj?.referenceId || (isHexId ? `DRV-${rawId.slice(-4).toUpperCase()}` : rawId || 'DRV-001');

        const dedupKey = `${rawId}_${record.date}`;
        seenKeys.add(dedupKey);

        logs.push({
          ...record,
          driverId: rawId,
          driverName,
          displayDriverId,
          phone: driverObj?.phone || '',
          license: driverObj?.license || '',
          assignedRoute: assignedRoute ? `Route ${assignedRoute.routeId}` : null
        });
      });

      // 2. Process localStorage attendance logs
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('erp_driver_attendance_')) {
          try {
            const driverData = JSON.parse(localStorage.getItem(key) || '[]');
            const rawKeyId = key.split('erp_driver_attendance_')[1];
            const driverObj = findDriver(rawKeyId);
            const assignedRoute = uniqueRoutes.find(r => r.driver && driverObj && cleanStr(r.driver).includes(cleanStr(driverObj.name)));
            const isHexId = /^[0-9a-fA-F]{24}$/.test(rawKeyId);

            if (Array.isArray(driverData)) {
              driverData.forEach(record => {
                const recDriverId = record.driverId || rawKeyId;
                const dedupKey = `${recDriverId}_${record.date}`;
                if (!seenKeys.has(dedupKey)) {
                  seenKeys.add(dedupKey);

                  let driverName = record.driverName;
                  if (!driverName || isHexId || /^[0-9a-fA-F]{24}$/.test(driverName)) {
                    driverName = driverObj?.name || (uniqueDrivers.length > 0 ? uniqueDrivers[0].name : 'Bus Driver');
                  }

                  const displayDriverId = driverObj?.driverId || driverObj?.referenceId || (isHexId ? `DRV-${rawKeyId.slice(-4).toUpperCase()}` : rawKeyId || 'DRV-001');

                  logs.push({
                    ...record,
                    driverId: recDriverId,
                    driverName,
                    displayDriverId,
                    phone: driverObj?.phone || '',
                    license: driverObj?.license || '',
                    assignedRoute: assignedRoute ? `Route ${assignedRoute.routeId}` : null
                  });
                }
              });
            }
          } catch (e) {
            console.error('Error parsing attendance', e);
          }
        }
      }

      // Sort by date descending
      logs.sort((a, b) => new Date(b.date) - new Date(a.date));
      setDriverAttendanceLogs(logs);

      // Fetch maintenance and complaints
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

  useEffect(() => {
    fetchTransportData();

    const handleStorage = (e) => {
      if (!e || !e.key || e.key.startsWith('erp_driver_attendance_')) {
        fetchTransportData();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const TABS = [
    { name: 'Dashboard', icon: <LayoutGrid size={16} /> },
    { name: 'Routes & Vehicles', icon: <Navigation size={16} /> },
    { name: 'Drivers', icon: <UserCheck size={16} /> },
    { name: 'Student Allocation', icon: <Users size={16} /> },
    { name: 'Attendance', icon: <Clock size={16} /> },
    { name: 'Tasks & Maintenance', icon: <Wrench size={16} /> },
    { name: 'Reports', icon: <FileText size={16} /> }
  ];

  const pendingFeeTotal = students.filter(s => s.feeStatus === 'Pending').reduce((a, b) => a + (Number(b.amount) || 0), 0);
  const collectedFeeTotal = students.filter(s => s.feeStatus === 'Paid').reduce((a, b) => a + (Number(b.amount) || 0), 0);

  return (
    <div className="transport-page animate-fade-in">
      
      {/* ── Page Header (Real-Time ERP Sync) ── */}
      <div className="page-header">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1>Advanced Transport Management 🚌</h1>
            <div className="erp-live-sync-pill">
              <span className="erp-live-pulse-dot"></span>
              <span>Real-Time Fleet Synced</span>
            </div>
          </div>
          <p className="text-muted">Centralized control for college fleets, active routes, student transport allocations, driver duty register, and maintenance.</p>
        </div>

        <div className="header-actions">
          {activeTab === 'Routes & Vehicles' && (
            <button className="btn-primary shadow-glow" onClick={() => setShowRouteModal(true)}>
              <Plus size={16}/> Add Route
            </button>
          )}
          {activeTab === 'Drivers' && (
            <button className="btn-primary shadow-glow" onClick={() => setShowDriverModal(true)}>
              <Plus size={16}/> Add Driver
            </button>
          )}
          {activeTab === 'Student Allocation' && (
            <button className="btn-primary shadow-glow" onClick={() => setShowAssignModal(true)}>
              <Plus size={16}/> Assign Student
            </button>
          )}
          {activeTab === 'Tasks & Maintenance' && (
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={() => setShowComplaintModal(true)}>
                <Plus size={14}/> Assign Task
              </button>
              <button className="btn-primary shadow-glow" onClick={() => setShowMaintModal(true)}>
                <Plus size={14}/> Schedule Maintenance
              </button>
            </div>
          )}
          {(activeTab === 'Dashboard' || activeTab === 'Attendance' || activeTab === 'Reports') && (
            <button className="btn-primary shadow-glow" onClick={handleViewManifest}>
              <Download size={16}/> Export Report
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs Navigation Bar ── */}
      <div className="fm-tabs-container">
        {TABS.map(tab => (
          <button 
            key={tab.name} 
            className={`fm-tab ${activeTab === tab.name ? 'active' : ''}`} 
            onClick={() => { setActiveTab(tab.name); setSearch(''); }}
          >
            {tab.icon}
            {tab.name}
          </button>
        ))}
      </div>

      {/* ── Tab: Dashboard ── */}
      {activeTab === 'Dashboard' && (
        <div className="animate-fade-in flex flex-col gap-6">
          {/* Executive KPI Grid */}
          <div className="fm-kpi-grid">
            <div className="sm-summary-card glass-card">
              <Bus size={20} className="text-primary"/>
              <span className="sm-summary-label">Total Fleet Buses</span>
              <span className="sm-summary-value gradient-text">{vehicles.length || routes.length || 8}</span>
            </div>
            <div className="sm-summary-card glass-card">
              <Navigation size={20} className="text-indigo-600"/>
              <span className="sm-summary-label">Active Routes</span>
              <span className="sm-summary-value text-indigo-600">{routes.length}</span>
            </div>
            <div className="sm-summary-card glass-card">
              <Users size={20} className="text-green-600"/>
              <span className="sm-summary-label">Assigned Students</span>
              <span className="sm-summary-value text-green-600">{students.length}</span>
            </div>
            <div className="sm-summary-card glass-card">
              <UserCheck size={20} className="text-purple-500"/>
              <span className="sm-summary-label">Active Drivers</span>
              <span className="sm-summary-value text-purple-500">{drivers.length}</span>
            </div>
            <div className="sm-summary-card glass-card">
              <CreditCard size={20} className="text-danger"/>
              <span className="sm-summary-label">Pending Transport Fees</span>
              <span className="sm-summary-value text-danger">₹{pendingFeeTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Charts & Live Fleet Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 table-wrapper glass-card p-6">
              <h3 className="font-bold text-base mb-4 flex items-center gap-2">
                <Activity size={18} className="text-primary" /> Monthly Transport Ridership Trends
              </h3>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={CHART_DATA}>
                    <defs>
                      <linearGradient id="colorRiders" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color, #e2e8f0)" />
                    <XAxis dataKey="month" stroke="var(--text-muted, #64748b)" fontSize={12} tickLine={false} />
                    <YAxis stroke="var(--text-muted, #64748b)" fontSize={12} tickLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--bg-secondary, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}/>
                    <Area type="monotone" dataKey="riders" stroke="#6366F1" strokeWidth={2} fillOpacity={1} fill="url(#colorRiders)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="table-wrapper glass-card p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Bus size={18} className="text-emerald-600" /> Live Fleet Tracking
                </h3>
                <span className="status-badge badge-active">Live</span>
              </div>
              <div className="flex flex-col gap-3">
                {routes.slice(0, 4).map(route => (
                  <div key={route.routeId} className="p-3.5 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/40 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold">
                        <Bus size={18} />
                      </div>
                      <div>
                        <div className="font-bold text-sm">{route.name}</div>
                        <div className="text-xs text-muted">{route.vehicle} • {route.driver}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="status-badge badge-in-transit text-[11px]">In Transit</span>
                      <div className="text-[11px] text-muted mt-1 font-mono">{route.occupied || 0}/{route.capacity || 50} Seats</div>
                    </div>
                  </div>
                ))}
                {routes.length === 0 && (
                  <div className="p-8 text-center text-muted text-sm">No active routes operational.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Routes & Vehicles ── */}
      {activeTab === 'Routes & Vehicles' && (
        <div className="animate-fade-in flex flex-col gap-6">
          <div className="table-wrapper glass-card">
            <div className="filters-row">
              <div className="search-box">
                <Search size={16} />
                <input 
                  type="text" 
                  placeholder="Search route name, ID, or vehicle number..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                />
              </div>
              <button className="btn-primary" onClick={() => setShowRouteModal(true)}>
                <Plus size={16}/> Create Route
              </button>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Route ID</th>
                    <th>Route Name</th>
                    <th>Vehicle (Bus No)</th>
                    <th>Assigned Driver</th>
                    <th>Capacity / Occupancy</th>
                    <th>Route Points / Stops</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {routes
                    .filter(r => (r.name || '').toLowerCase().includes(search.toLowerCase()) || (r.routeId || '').toLowerCase().includes(search.toLowerCase()) || (r.vehicle || '').toLowerCase().includes(search.toLowerCase()))
                    .map((route, idx) => (
                    <tr key={route.routeId}>
                      <td className="text-muted font-medium">{idx + 1}</td>
                      <td><span className="code-badge">{route.routeId}</span></td>
                      <td className="font-bold text-gray-900 dark:text-white">{route.name}</td>
                      <td><span className="font-mono text-sm font-semibold">{route.vehicle}</span></td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className={`avatar-sm ${getAvatarColor(route.driver)}`} style={{ width: 26, height: 26, fontSize: '0.7rem' }}>
                            {getInitials(route.driver)}
                          </div>
                          <span className="font-medium text-sm">{route.driver}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold">{route.occupied || 0}/{route.capacity || 50}</span>
                          <span className="text-[11px] text-muted">Seats</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {Array.isArray(route.points) && route.points.map((p, i) => (
                            <span key={i} className="text-[11px] bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">
                              {p}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button className="btn-secondary py-1 px-2.5 text-xs" onClick={() => handleOpenEditPoints(route)}>
                            Edit Stops
                          </button>
                          <button className="btn-secondary py-1 px-2.5 text-xs" onClick={() => handleOpenChangeBus(route)}>
                            Change Bus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {routes.length === 0 && (
                    <tr><td colSpan="8" className="text-center text-muted p-8">No bus routes configured. Click "Create Route" to add one.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Drivers Register ── */}
      {activeTab === 'Drivers' && (
        <div className="animate-fade-in flex flex-col gap-6">
          <div className="table-wrapper glass-card">
            <div className="filters-row">
              <div className="search-box">
                <Search size={16} />
                <input 
                  type="text" 
                  placeholder="Search driver name, ID, phone, or license..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                />
              </div>
              <button className="btn-primary" onClick={() => setShowDriverModal(true)}>
                <Plus size={16}/> Add Driver
              </button>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Driver Info</th>
                    <th>Driver ID</th>
                    <th>Contact Phone</th>
                    <th>Experience</th>
                    <th>Driving License</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {drivers
                    .filter(d => (d.name || '').toLowerCase().includes(search.toLowerCase()) || (d.driverId || '').toLowerCase().includes(search.toLowerCase()) || (d.phone || '').includes(search))
                    .map((driver, idx) => (
                    <tr key={driver.driverId || driver._id || idx}>
                      <td className="text-muted font-medium">{idx + 1}</td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className={`avatar-sm ${getAvatarColor(driver.name)}`}>
                            {getInitials(driver.name)}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 dark:text-white">{driver.name}</div>
                            {driver.email && <div className="text-xs text-muted font-mono">{driver.email}</div>}
                          </div>
                        </div>
                      </td>
                      <td><span className="code-badge">{driver.driverId || driver.referenceId || `DRV-${(driver._id || '').slice(-4).toUpperCase()}`}</span></td>
                      <td className="font-mono text-sm">{driver.phone || '—'}</td>
                      <td className="text-sm font-medium">{driver.experience || '3+ Years'}</td>
                      <td><span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-gray-700 dark:text-gray-300 font-semibold">{driver.license || 'LMV/HMV'}</span></td>
                      <td>
                        <span className={`status-badge ${driver.status === 'Active' ? 'badge-active' : 'badge-pending'}`}>
                          {driver.status || 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {drivers.length === 0 && (
                    <tr><td colSpan="7" className="text-center text-muted p-8">No drivers registered yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Student Allocation ── */}
      {activeTab === 'Student Allocation' && (
        <div className="animate-fade-in flex flex-col gap-6">
          <div className="table-wrapper glass-card">
            <div className="filters-row">
              <div className="search-box">
                <Search size={16} />
                <input 
                  type="text" 
                  placeholder="Search student by name, roll no, or route..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                />
              </div>
              <button className="btn-primary" onClick={() => setShowAssignModal(true)}>
                <Plus size={16}/> Assign Student
              </button>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Student Details</th>
                    <th>Register / Roll No</th>
                    <th>Bus Route</th>
                    <th>Pickup Point</th>
                    <th>Fee Status</th>
                    <th>Fee Amount</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {students
                    .filter(s => (s.name || '').toLowerCase().includes(search.toLowerCase()) || (s.studentId || '').toLowerCase().includes(search.toLowerCase()) || (s.routeId || '').toLowerCase().includes(search.toLowerCase()))
                    .map((student, idx) => (
                    <tr key={student.studentId || idx}>
                      <td className="text-muted font-medium">{idx + 1}</td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className={`avatar-sm ${getAvatarColor(student.name)}`}>
                            {getInitials(student.name)}
                          </div>
                          <div className="font-bold text-gray-900 dark:text-white">{student.name}</div>
                        </div>
                      </td>
                      <td><span className="code-badge">{student.studentId}</span></td>
                      <td>
                        <span className="status-badge badge-route">
                          {student.routeId || 'Unassigned'}
                        </span>
                      </td>
                      <td className="text-sm font-medium">{student.pickupPoint || 'Not Specified'}</td>
                      <td>
                        <span className={`status-badge ${student.feeStatus === 'Paid' ? 'badge-paid' : 'badge-pending'}`}>
                          {student.feeStatus || 'Pending'}
                        </span>
                      </td>
                      <td className="font-bold text-sm text-gray-900 dark:text-white">₹{Number(student.amount || 0).toLocaleString('en-IN')}</td>
                      <td>
                        <button className="btn-secondary py-1 px-3 text-xs" onClick={() => handleOpenReallocate(student)}>
                          Reallocate
                        </button>
                      </td>
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr><td colSpan="8" className="text-center text-muted p-8">No students assigned to transport routes yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Driver Attendance Logs ── */}
      {activeTab === 'Attendance' && (
        <div className="animate-fade-in flex flex-col gap-6">
          <div className="table-wrapper glass-card">
            <div className="filters-row">
              <div className="search-box">
                <Search size={16} />
                <input 
                  type="text" 
                  placeholder="Search driver name, ID, route, or date..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                />
              </div>
              <div className="text-xs font-semibold text-muted">
                Showing {driverAttendanceLogs.length} verified duty shifts
              </div>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Driver Details</th>
                    <th>Check In Time</th>
                    <th>Check Out Time</th>
                    <th>Duty Status</th>
                  </tr>
                </thead>
                <tbody>
                  {driverAttendanceLogs
                    .filter(log => 
                      (log.driverName || '').toLowerCase().includes(search.toLowerCase()) || 
                      (log.displayDriverId || '').toLowerCase().includes(search.toLowerCase()) || 
                      (log.assignedRoute || '').toLowerCase().includes(search.toLowerCase()) || 
                      (log.date || '').includes(search)
                    )
                    .map((log, index) => (
                    <tr key={`${log.driverId || index}-${index}`}>
                      <td className="font-semibold text-sm">
                        {log.date ? new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Today'}
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className={`avatar-sm ${getAvatarColor(log.driverName)}`}>
                            {getInitials(log.driverName)}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                              {log.driverName}
                              {log.assignedRoute && (
                                <span className="status-badge badge-route text-[10px] py-0.5 px-1.5">
                                  {log.assignedRoute}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted flex items-center gap-2 mt-0.5">
                              <span className="font-mono font-medium">ID: {log.displayDriverId}</span>
                              {log.phone && <span className="font-mono text-gray-400">• {log.phone}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="font-mono text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                        {log.checkInTime ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Clock size={14} className="text-emerald-500" />
                            {log.checkInTime}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="font-mono text-sm text-gray-600 dark:text-gray-400">
                        {log.checkOutTime ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Clock size={14} className="text-gray-400" />
                            {log.checkOutTime}
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        <span className={`status-badge ${
                          log.status === 'Present' ? 'badge-present' :
                          log.status === 'On Leave' ? 'badge-route' : 'badge-pending'
                        }`}>
                          {log.status || 'Present'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {driverAttendanceLogs.length === 0 && (
                    <tr><td colSpan="5" className="text-center text-muted p-8">No attendance records found. Drivers punch check-in via their dashboard.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Tasks & Maintenance ── */}
      {activeTab === 'Tasks & Maintenance' && (
        <div className="animate-fade-in flex flex-col gap-6">
          {/* Scheduled Maintenance */}
          <div className="table-wrapper glass-card">
            <div className="filters-row">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Wrench size={18} className="text-primary" /> Vehicle Fleet Maintenance Logs
              </h3>
              <button className="btn-primary py-1.5 px-3 text-xs" onClick={() => setShowMaintModal(true)}>
                <Plus size={14}/> Schedule Maintenance
              </button>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Vehicle (Bus No)</th>
                    <th>Service Type</th>
                    <th>Service Date</th>
                    <th>Remarks / Instructions</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenanceTasks.map(task => (
                    <tr key={task._id}>
                      <td className="font-mono font-bold">{task.vehicleNumber}</td>
                      <td><span className="status-badge badge-route">{task.serviceType}</span></td>
                      <td className="font-semibold text-sm">{task.serviceDate}</td>
                      <td className="text-sm text-muted">{task.remarks || 'Standard servicing'}</td>
                      <td>
                        <span className={`status-badge ${task.status === 'Completed' ? 'badge-paid' : 'badge-scheduled'}`}>
                          {task.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {maintenanceTasks.length === 0 && (
                    <tr><td colSpan="5" className="text-center text-muted p-8">No vehicle maintenance scheduled.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Complaints & Tasks */}
          <div className="table-wrapper glass-card">
            <div className="filters-row">
              <h3 className="font-bold text-base flex items-center gap-2">
                <ShieldAlert size={18} className="text-amber-600" /> Driver Operational Tasks & Grievances
              </h3>
              <button className="btn-secondary py-1.5 px-3 text-xs" onClick={() => setShowComplaintModal(true)}>
                <Plus size={14}/> Assign Driver Task
              </button>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Task ID</th>
                    <th>Student ID</th>
                    <th>Name</th>
                    <th>Bus / Route</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Assigned Driver</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map(comp => (
                    <tr key={comp._id}>
                      <td><span className="code-badge">{comp.complaintId}</span></td>
                      <td className="font-mono text-sm">{comp.studentId}</td>
                      <td className="font-medium">{comp.name}</td>
                      <td>
                        <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded mr-1">{comp.busNumber || 'N/A'}</span>
                        <span className="status-badge badge-route text-[11px]">{comp.routeId || 'N/A'}</span>
                      </td>
                      <td className="font-bold text-xs">{comp.complaintType}</td>
                      <td className="text-sm max-w-xs truncate" title={comp.description}>{comp.description}</td>
                      <td><span className="font-bold text-sm text-primary">{comp.assignedTo || 'Unassigned'}</span></td>
                      <td>
                        <span className={`status-badge ${
                          comp.status === 'Resolved' ? 'badge-paid' :
                          comp.status === 'In Progress' ? 'badge-route' : 'badge-pending'
                        }`}>
                          {comp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {complaints.length === 0 && (
                    <tr><td colSpan="8" className="text-center text-muted p-8">No driver tasks or student complaints logged.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Reports ── */}
      {activeTab === 'Reports' && (
        <div className="animate-fade-in table-wrapper glass-card p-10 flex flex-col items-center text-center">
          <FileText size={48} className="text-primary opacity-60 mb-4"/>
          <h2 className="text-xl font-bold mb-2">Transport Financial & Operations Reports</h2>
          <p className="text-muted max-w-md mb-6">Generate and export route-wise passenger lists, fee defaulter registers, and driver attendance logs.</p>
          <div className="flex gap-4">
            <button className="btn-primary shadow-glow flex items-center gap-2" onClick={handleViewManifest}>
              <FileText size={16}/> View Passenger Manifest
            </button>
            <button className="btn-secondary flex items-center gap-2" onClick={handleViewDefaulters}>
              <CreditCard size={16}/> View Fee Defaulters
            </button>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      
      {/* Create Route Modal */}
      {showRouteModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h2>Create New Route</h2>
              <button className="text-muted hover:text-danger text-lg" onClick={() => setShowRouteModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateRoute}>
              <div className="modal-body flex flex-col gap-4">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Route ID</label>
                    <input type="text" required placeholder="e.g. R-01" className="input-field" value={routeForm.routeId} onChange={e => setRouteForm({...routeForm, routeId: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Route Name</label>
                    <input type="text" required placeholder="e.g. North Campus Line" className="input-field" value={routeForm.name} onChange={e => setRouteForm({...routeForm, name: e.target.value})} />
                  </div>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Vehicle (Bus No)</label>
                    <input type="text" required placeholder="e.g. TN 01 AB 1234" className="input-field" value={routeForm.vehicle} onChange={e => setRouteForm({...routeForm, vehicle: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Assigned Driver</label>
                    <select className="input-field" required value={routeForm.driver} onChange={e => setRouteForm({...routeForm, driver: e.target.value})}>
                      <option value="">Select Driver</option>
                      {drivers.map(d => (
                        <option key={d.driverId || d._id} value={d.name}>{d.name} ({d.driverId || 'DRV'})</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Seating Capacity</label>
                  <input type="number" required placeholder="50" className="input-field" value={routeForm.capacity} onChange={e => setRouteForm({...routeForm, capacity: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Route Stops / Points (Comma Separated)</label>
                  <textarea rows="3" required placeholder="Stop A, Stop B, Stop C, College Campus" className="input-field" value={routeForm.points} onChange={e => setRouteForm({...routeForm, points: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowRouteModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create Route</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Driver Modal */}
      {showDriverModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h2>Add New Transport Driver</h2>
              <button className="text-muted hover:text-danger text-lg" onClick={() => setShowDriverModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddDriver}>
              <div className="modal-body flex flex-col gap-4">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Driver ID</label>
                    <input type="text" required placeholder="e.g. DRV-001" className="input-field" value={driverForm.driverId} onChange={e => setDriverForm({...driverForm, driverId: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Driver Full Name</label>
                    <input type="text" required placeholder="e.g. Ramesh Kumar" className="input-field" value={driverForm.name} onChange={e => setDriverForm({...driverForm, name: e.target.value})} />
                  </div>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Contact Phone</label>
                    <input type="text" required placeholder="+91 9876543210" className="input-field" value={driverForm.phone} onChange={e => setDriverForm({...driverForm, phone: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Driving License No.</label>
                    <input type="text" required placeholder="TN-XX-XXXX" className="input-field" value={driverForm.license} onChange={e => setDriverForm({...driverForm, license: e.target.value})} />
                  </div>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Login Email</label>
                    <input type="email" required placeholder="driver@college.edu" className="input-field" value={driverForm.email} onChange={e => setDriverForm({...driverForm, email: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Password</label>
                    <input type="password" required placeholder="password123" className="input-field" value={driverForm.password} onChange={e => setDriverForm({...driverForm, password: e.target.value})} />
                  </div>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Experience</label>
                    <input type="text" placeholder="e.g. 5 Years" className="input-field" value={driverForm.experience} onChange={e => setDriverForm({...driverForm, experience: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select className="input-field" value={driverForm.status} onChange={e => setDriverForm({...driverForm, status: e.target.value})}>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowDriverModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Register Driver</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Student Modal */}
      {showAssignModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h2>Assign Student to Route</h2>
              <button className="text-muted hover:text-danger text-lg" onClick={() => setShowAssignModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAssignStudent}>
              <div className="modal-body flex flex-col gap-4">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Student ID (Roll No)</label>
                    <input type="text" required placeholder="e.g. CS2026001" className="input-field" value={assignForm.studentId} onChange={e => setAssignForm({...assignForm, studentId: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Student Name</label>
                    <input type="text" required placeholder="e.g. Priya Kumar" className="input-field" value={assignForm.name} onChange={e => setAssignForm({...assignForm, name: e.target.value})} />
                  </div>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Select Route</label>
                    <select className="input-field" required value={assignForm.routeId} onChange={e => setAssignForm({...assignForm, routeId: e.target.value})}>
                      <option value="">Select Route</option>
                      {routes.map(r => (
                        <option key={r.routeId} value={r.routeId}>{r.routeId} - {r.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Pickup Point</label>
                    <input type="text" required placeholder="e.g. City Central Hub" className="input-field" value={assignForm.pickupPoint} onChange={e => setAssignForm({...assignForm, pickupPoint: e.target.value})} />
                  </div>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Fee Status</label>
                    <select className="input-field" value={assignForm.feeStatus} onChange={e => setAssignForm({...assignForm, feeStatus: e.target.value})}>
                      <option value="Pending">Pending</option>
                      <option value="Paid">Paid</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Fee Amount (₹)</label>
                    <input type="number" required placeholder="15000" className="input-field" value={assignForm.amount} onChange={e => setAssignForm({...assignForm, amount: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowAssignModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Assign Student</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Route Points Modal */}
      {showEditPointsModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h2>Edit Stops for {editPointsRoute?.name}</h2>
              <button className="text-muted hover:text-danger text-lg" onClick={() => setShowEditPointsModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSavePoints}>
              <div className="modal-body flex flex-col gap-4">
                <div className="form-group">
                  <label>Route Stops (Comma-Separated)</label>
                  <textarea rows="5" required className="input-field" value={editPointsValue} onChange={e => setEditPointsValue(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowEditPointsModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Stops</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Bus Modal */}
      {showChangeBusModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h2>Change Bus & Driver for {changeBusRoute?.name}</h2>
              <button className="text-muted hover:text-danger text-lg" onClick={() => setShowChangeBusModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveBus}>
              <div className="modal-body flex flex-col gap-4">
                <div className="form-group">
                  <label>Vehicle (Bus Number)</label>
                  <input type="text" required placeholder="e.g. TN 01 AB 1234" className="input-field" value={changeBusForm.vehicle} onChange={e => setChangeBusForm({...changeBusForm, vehicle: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Driver Name</label>
                  <select className="input-field" required value={changeBusForm.driver} onChange={e => setChangeBusForm({...changeBusForm, driver: e.target.value})}>
                    <option value="">Select Driver</option>
                    {drivers.map(d => (
                      <option key={d.driverId || d._id} value={d.name}>{d.name} ({d.driverId || 'DRV'})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowChangeBusModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Maintenance Modal */}
      {showMaintModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h2>Schedule Vehicle Maintenance</h2>
              <button className="text-muted hover:text-danger text-lg" onClick={() => setShowMaintModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateMaintenance}>
              <div className="modal-body flex flex-col gap-4">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Select Vehicle</label>
                    <select className="input-field" required value={maintForm.vehicleNumber} onChange={e => setMaintForm({...maintForm, vehicleNumber: e.target.value})}>
                      <option value="">Select Vehicle</option>
                      {routes.map(r => (
                        <option key={r.routeId} value={r.vehicle}>{r.vehicle} (Route {r.routeId})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Service Type</label>
                    <select className="input-field" value={maintForm.serviceType} onChange={e => setMaintForm({...maintForm, serviceType: e.target.value})}>
                      <option value="General">General Periodic Service</option>
                      <option value="Oil Change">Engine Oil & Filters</option>
                      <option value="Brake Service">Brake Overhaul</option>
                      <option value="Tire Replacement">Tire Replacement & Alignment</option>
                      <option value="Engine Repair">Engine Diagnostics & Repair</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Scheduled Service Date</label>
                  <input type="date" required className="input-field" value={maintForm.serviceDate} onChange={e => setMaintForm({...maintForm, serviceDate: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Remarks / Driver Notes</label>
                  <textarea rows="3" placeholder="Describe issue or instructions..." className="input-field" value={maintForm.remarks} onChange={e => setMaintForm({...maintForm, remarks: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowMaintModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Schedule Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Task / Complaint Modal */}
      {showComplaintModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h2>Assign Operational Task / Grievance</h2>
              <button className="text-muted hover:text-danger text-lg" onClick={() => setShowComplaintModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateComplaint}>
              <div className="modal-body flex flex-col gap-4">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Student (Reporter / Beneficiary)</label>
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
                  <div className="form-group">
                    <label>Assign To Driver</label>
                    <select className="input-field" required value={complaintForm.assignedTo} onChange={e => setComplaintForm({...complaintForm, assignedTo: e.target.value})}>
                      <option value="">Select Driver</option>
                      {drivers.map(d => (
                        <option key={d.driverId || d._id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Bus Number</label>
                    <input type="text" readOnly className="input-field bg-gray-100 dark:bg-gray-800" value={complaintForm.busNumber} />
                  </div>
                  <div className="form-group">
                    <label>Route ID</label>
                    <input type="text" readOnly className="input-field bg-gray-100 dark:bg-gray-800" value={complaintForm.routeId} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select className="input-field" value={complaintForm.complaintType} onChange={e => setComplaintForm({...complaintForm, complaintType: e.target.value})}>
                    <option value="General">General Assistance</option>
                    <option value="Route Delay">Route Delay Issue</option>
                    <option value="Student Behavior">Student Incident</option>
                    <option value="Lost Item">Lost Item Inquiry</option>
                    <option value="Maintenance Request">Vehicle Alert</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Description / Details</label>
                  <textarea rows="3" required placeholder="Provide clear task details..." className="input-field" value={complaintForm.description} onChange={e => setComplaintForm({...complaintForm, description: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowComplaintModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Assign Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Preview Modal */}
      {reportModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '900px' }}>
            <div className="modal-header">
              <h2>{reportModal.title}</h2>
              <div className="flex items-center gap-2">
                <button 
                  className="btn-primary py-1 px-3 text-xs flex items-center gap-1.5"
                  onClick={() => downloadCSV(reportModal.filename, [reportModal.headers, ...reportModal.rows])}
                >
                  <Download size={14}/> Download CSV
                </button>
                <button className="text-muted hover:text-danger text-lg ml-2" onClick={() => setReportModal({ ...reportModal, isOpen: false })}>✕</button>
              </div>
            </div>
            <div className="modal-body p-0">
              <div className="table-container" style={{ maxHeight: '60vh' }}>
                <table>
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
                      <tr><td colSpan={reportModal.headers.length} className="text-center p-8 text-muted">No records found for this report.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-4 right-4 z-50">
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
