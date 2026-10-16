import React, { useState, useEffect } from 'react';
import {
  Bus, Users, Navigation, Plus, Search, Download,
  CreditCard, UserCheck, ShieldCheck, FileText, BarChart, Clock,
  CheckCircle, AlertCircle, CheckSquare, Wrench, Edit, Trash2
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

  // Driver Management State & Handlers
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [driverForm, setDriverForm] = useState({
    driverId: '', name: '', experience: '', license: '', phone: '', status: 'Active', email: '', password: ''
  });

  const handleOpenEditDriver = (driver) => {
    setEditingDriver(driver);
    setDriverForm({
      driverId: driver.driverId || driver._id || '',
      name: driver.name || '',
      experience: driver.experience || '',
      license: driver.license || '',
      phone: driver.phone || '',
      status: driver.status || 'Active',
      email: driver.email || '',
      password: ''
    });
    setShowDriverModal(true);
  };

  const handleSaveDriverSubmit = async (e) => {
    e.preventDefault();
    if (!driverForm.name || !driverForm.driverId) return;

    if (editingDriver) {
      // Edit mode
      try {
        if (editingDriver._id && !editingDriver._id.startsWith('mock-') && editingDriver._id.length > 10) {
          await updateTransportDriver(editingDriver._id, driverForm);
        }
      } catch (err) {
        console.warn('Backend update driver failed, updating locally', err);
      }

      setDrivers(prev => {
        const updated = prev.map(d =>
          (d._id === editingDriver._id || d.driverId === editingDriver.driverId)
            ? { ...d, ...driverForm }
            : d
        );
        localStorage.setItem(`erp_transport_drivers_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(updated));
        return updated;
      });

      showToast(`Successfully updated driver ${driverForm.name}`);
      setShowDriverModal(false);
      setEditingDriver(null);
      setDriverForm({ driverId: '', name: '', experience: '', license: '', phone: '', status: 'Active', email: '', password: '' });
    } else {
      // Add mode
      try {
        const res = await createTransportDriver(driverForm);
        const newDriver = res.data || { _id: Date.now().toString(), ...driverForm };

        setDrivers(prev => {
          const updated = [newDriver, ...prev];
          localStorage.setItem(`erp_transport_drivers_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(updated));
          return updated;
        });
        showToast(`Successfully added driver ${driverForm.name}`);
      } catch (err) {
        console.error(err);
        const newDriver = { _id: Date.now().toString(), ...driverForm };
        setDrivers(prev => {
          const updated = [newDriver, ...prev];
          localStorage.setItem(`erp_transport_drivers_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(updated));
          return updated;
        });
        showToast(`Added driver ${driverForm.name} locally`);
      }
      setShowDriverModal(false);
      setDriverForm({ driverId: '', name: '', experience: '', license: '', phone: '', status: 'Active', email: '', password: '' });
    }
  };

  const handleDeleteDriver = async (driver) => {
    if (!window.confirm(`Are you sure you want to delete driver ${driver.name}?`)) return;

    try {
      if (driver._id && !driver._id.startsWith('mock-') && driver._id.length > 10) {
        await deleteTransportDriver(driver._id);
      }
    } catch (err) {
      console.warn('Backend delete driver failed, removing locally', err);
    }

    setDrivers(prev => {
      const updated = prev.filter(d => d._id !== driver._id && d.driverId !== driver.driverId);
      localStorage.setItem(`erp_transport_drivers_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(updated));
      return updated;
    });

    showToast(`Driver ${driver.name} removed successfully`);
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
        const tId = sessionStorage.getItem('tenantId') || 'mock_college_id';
        localStorage.setItem(`erp_transport_routes_${tId}`, JSON.stringify(updated));
        localStorage.setItem('erp_transport_routes_mock_college_id', JSON.stringify(updated));
        localStorage.setItem('erp_transport_routes', JSON.stringify(updated));
        return updated;
      });
      showToast(`Successfully created route ${routeForm.name}`);
    } catch (err) {
      console.error('API create route failed, saving locally:', err);
      const localRoute = { _id: Date.now().toString(), ...newRoute };
      setRoutes(prev => {
        const updated = [localRoute, ...prev];
        const tId = sessionStorage.getItem('tenantId') || 'mock_college_id';
        localStorage.setItem(`erp_transport_routes_${tId}`, JSON.stringify(updated));
        localStorage.setItem('erp_transport_routes_mock_college_id', JSON.stringify(updated));
        localStorage.setItem('erp_transport_routes', JSON.stringify(updated));
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
      const tId = sessionStorage.getItem('tenantId') || 'mock_college_id';
      localStorage.setItem(`erp_transport_routes_${tId}`, JSON.stringify(updated));
      localStorage.setItem('erp_transport_routes_mock_college_id', JSON.stringify(updated));
      localStorage.setItem('erp_transport_routes', JSON.stringify(updated));
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
      const tId = sessionStorage.getItem('tenantId') || 'mock_college_id';
      localStorage.setItem(`erp_transport_routes_${tId}`, JSON.stringify(updated));
      localStorage.setItem('erp_transport_routes_mock_college_id', JSON.stringify(updated));
      localStorage.setItem('erp_transport_routes', JSON.stringify(updated));
      return updated;
    });

    showToast(`Successfully updated vehicle and driver for route ${changeBusRoute.name}`);
    setShowChangeBusModal(false);
    setChangeBusRoute(null);
  };

  const handleAssignStudent = async (e) => {
    e.preventDefault();
    if (!assignForm.studentId || !assignForm.routeId) return;

    const targetRoute = routes.find(r => r.routeId === assignForm.routeId || r.name === assignForm.routeId);
    const newStudent = {
      studentId: assignForm.studentId,
      name: assignForm.name || 'Unknown Student',
      routeId: assignForm.routeId,
      pickupPoint: assignForm.pickupPoint,
      feeStatus: assignForm.feeStatus,
      amount: Number(assignForm.amount) || 0,
      vehicleNumber: targetRoute?.vehicle || assignForm.vehicleNumber || '',
      driverName: targetRoute?.driver || assignForm.driverName || '',
      driverContact: targetRoute?.contact || ''
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

      // Merge from main students db
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
          driverName = driverObj?.name || 'Bus Driver';
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
                  if (!driverName || /^[0-9a-fA-F]{24}$/.test(driverName)) {
                    driverName = driverObj?.name || 'Bus Driver';
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => window.location.href = '/admin/bus-tracking'}
            style={{
              background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 18px',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(37,99,235,0.3)'
            }}
          >
            <Bus size={18} />
            <span>Live Gate Tracking & Fleet</span>
          </button>
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
              <p className="tm-kpi-value tm-text-danger">₹ {students.filter(s => s.feeStatus === 'Pending').reduce((a, b) => a + b.amount, 0).toLocaleString('en-IN')}</p>
            </div>
          </div>

          <div className="transport-charts-grid mt-6">
            <div className="glass-card p-6">
              <h2 className="text-lg font-bold mb-4">Monthly Ridership Trends</h2>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={CHART_DATA}>
                  <defs>
                    <linearGradient id="colorRiders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.2} />
                  <XAxis dataKey="month" stroke="var(--text-muted)" />
                  <YAxis stroke="var(--text-muted)" />
                  <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: '8px' }} />
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: 'var(--text-main, #0f172a)' }}>Manage Bus Routes</h2>
            <button className="tm-btn tm-btn-primary" onClick={() => setShowRouteModal(true)}><Plus size={16} /> Create Route</button>
          </div>
          <div className="tm-routes-grid">
            {routes.map(route => (
              <div key={route.routeId} className="tm-route-card">
                <div>
                  <div className="tm-route-header">
                    <h3 className="tm-route-title">{route.name}</h3>
                    <div className="tm-badge tm-badge-route">
                      {route.routeId}
                    </div>
                  </div>
                  <div className="tm-route-meta">
                    <span className="tm-route-meta-item"><Bus size={14} /> {route.vehicle}</span>
                    <span className="tm-route-meta-item"><ShieldCheck size={14} /> {route.driver}</span>
                    <span className="tm-route-meta-item"><Users size={14} /> {route.occupied} / {route.capacity} Allocated</span>
                  </div>
                  <div className="tm-route-points">
                    {route.points.map((point, idx) => (
                      <div key={idx} className="tm-point-tag">{point}</div>
                    ))}
                  </div>
                </div>
                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                  <button className="tm-btn tm-btn-secondary" style={{ flex: 1, padding: '0.45rem 0.5rem', fontSize: '0.78rem' }} onClick={() => handleOpenEditPoints(route)}>Edit Points</button>
                  <button className="tm-btn tm-btn-secondary" style={{ flex: 1, padding: '0.45rem 0.5rem', fontSize: '0.78rem' }} onClick={() => handleOpenChangeBus(route)}>Change Bus</button>
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
                <input type="text" className="tm-input" placeholder="Search student or route..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <button className="tm-btn tm-btn-primary" onClick={() => setShowAssignModal(true)}><Plus size={16} /> Assign Student</button>
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
                  {students
                    .filter(st =>
                      (st.name || '').toLowerCase().includes(search.toLowerCase()) ||
                      (st.studentId || '').toLowerCase().includes(search.toLowerCase()) ||
                      (st.routeId || '').toLowerCase().includes(search.toLowerCase()) ||
                      (st.pickupPoint || '').toLowerCase().includes(search.toLowerCase())
                    )
                    .map(st => (
                    <tr key={st.studentId}>
                      <td style={{ fontFamily: 'monospace', fontWeight: '700' }}>{st.studentId}</td>
                      <td style={{ fontWeight: '600' }}>{st.name}</td>
                      <td><span className="tm-badge tm-badge-route">{st.routeId}</span></td>
                      <td>{st.pickupPoint}</td>
                      <td>
                        {st.feeStatus === 'Paid' ? (
                          <span className="tm-badge tm-badge-paid">Paid (₹{st.amount})</span>
                        ) : (
                          <span className="tm-badge tm-badge-pending">Pending (₹{st.amount})</span>
                        )}
                      </td>
                      <td>
                        <button className="tm-btn tm-btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }} onClick={() => handleOpenReallocate(st)}>Re-allocate</button>
                      </td>
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No students assigned to transport.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Tasks & Maintenance' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Maintenance Section */}
          <div className="tm-panel">
            <div className="tm-panel-header">
              <h3 className="tm-panel-title">
                <Wrench size={18} className="tm-text-primary" /> Vehicle Maintenance Schedules
              </h3>
              <button className="tm-btn tm-btn-primary" onClick={() => setShowMaintModal(true)}>
                <Plus size={14} /> Schedule Maintenance
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
                      <td style={{ fontFamily: 'monospace', fontWeight: '700' }}>{task.vehicleNumber}</td>
                      <td>{task.serviceType}</td>
                      <td>{new Date(task.serviceDate).toLocaleDateString()}</td>
                      <td>
                        <span className={`tm-badge ${task.status === 'Completed' ? 'tm-badge-paid' :
                          task.status === 'In Progress' ? 'tm-badge-route' : 'tm-badge-pending'
                          }`}>
                          {task.status}
                        </span>
                      </td>
                      <td style={{ color: '#64748b', fontSize: '0.84rem' }}>{task.remarks || 'No remarks'}</td>
                    </tr>
                  ))}
                  {maintenanceTasks.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No maintenance tasks scheduled.</td>
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
                <CheckSquare size={18} className="tm-text-primary" /> Driver Tasks & Student Complaints
              </h3>
              <button className="tm-btn tm-btn-primary" onClick={() => setShowComplaintModal(true)}>
                <Plus size={14} /> Assign Driver Task
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
                      <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{comp.complaintId}</td>
                      <td style={{ fontFamily: 'monospace', fontWeight: '700' }}>{comp.studentId}</td>
                      <td style={{ fontWeight: '600' }}>{comp.name}</td>
                      <td>
                        <span className="tm-badge" style={{ background: '#f1f5f9', color: '#334155', marginRight: '4px' }}>Bus: {comp.busNumber || 'N/A'}</span>
                        <span className="tm-badge tm-badge-route">Route: {comp.routeId || 'N/A'}</span>
                      </td>
                      <td style={{ fontWeight: '700', fontSize: '0.78rem' }}>{comp.complaintType}</td>
                      <td style={{ fontSize: '0.84rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={comp.description}>{comp.description}</td>
                      <td><span style={{ fontWeight: '700', color: '#2563eb' }}>{comp.assignedTo || 'Unassigned'}</span></td>
                      <td>
                        <span className={`tm-badge ${comp.status === 'Resolved' ? 'tm-badge-paid' :
                          comp.status === 'In Progress' ? 'tm-badge-route' : 'tm-badge-pending'
                          }`}>
                          {comp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {complaints.length === 0 && (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No driver tasks or complaints logged.</td>
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
          <div className="tm-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: 'var(--text-main, #0f172a)' }}>Manage Transport Drivers</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div className="tm-search-box" style={{ maxWidth: '280px' }}>
                <Search size={16} />
                <input
                  type="text"
                  className="tm-input"
                  placeholder="Search driver, phone, license..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <button className="tm-btn tm-btn-primary" onClick={() => {
                setEditingDriver(null);
                setDriverForm({ driverId: '', name: '', experience: '', license: '', phone: '', status: 'Active', email: '', password: '' });
                setShowDriverModal(true);
              }}>
                <Plus size={16} /> Add Driver
              </button>
            </div>
          </div>

          <div className="tm-routes-grid">
            {drivers
              .filter(driver =>
                (driver.name || '').toLowerCase().includes(search.toLowerCase()) ||
                (driver.driverId || '').toLowerCase().includes(search.toLowerCase()) ||
                (driver.phone || '').includes(search) ||
                (driver.license || '').toLowerCase().includes(search.toLowerCase())
              )
              .map(driver => {
                const assignedRoute = routes.find(r => r.driver && (r.driver.toLowerCase().includes((driver.name || '').toLowerCase()) || r.driver === driver.driverId));
                return (
                  <div key={driver.driverId || driver._id} className="tm-route-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      {/* Top Header Row in Card */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: '700', fontSize: '0.76rem', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', color: '#334155', border: '1px solid #cbd5e1' }}>
                          {driver.driverId || 'DRV-001'}
                        </span>
                        <span className={`tm-badge ${driver.status === 'Active' ? 'tm-badge-paid' : 'tm-badge-pending'}`}>
                          {driver.status || 'Active'}
                        </span>
                      </div>

                      {/* Avatar & Main Info */}
                      <div style={{ textAlign: 'center', marginBottom: '0.85rem' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.65rem auto', border: '2px solid #bfdbfe', boxShadow: '0 2px 8px rgba(37,99,235,0.12)' }}>
                          <UserCheck size={28} />
                        </div>
                        <h3 className="tm-route-title" style={{ fontSize: '1.15rem', marginBottom: '0.25rem' }}>{driver.name}</h3>
                        {assignedRoute ? (
                          <span className="tm-badge tm-badge-route" style={{ fontSize: '0.72rem', marginTop: '2px' }}>
                            <Bus size={12} /> Route: {assignedRoute.routeId} ({assignedRoute.name})
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '600', background: '#f8fafc', padding: '2px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'inline-block', marginTop: '2px' }}>
                            No Route Assigned
                          </span>
                        )}
                      </div>

                      {/* Grid Details */}
                      <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', color: '#475569', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: '600', color: '#64748b' }}>Experience:</span>
                          <span style={{ fontWeight: '700', color: '#0f172a' }}>{driver.experience || '5 Years'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: '600', color: '#64748b' }}>License:</span>
                          <span style={{ fontWeight: '700', color: '#0f172a', fontFamily: 'monospace' }}>{driver.license || 'N/A'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: '600', color: '#64748b' }}>Phone:</span>
                          <span style={{ fontWeight: '700', color: '#2563eb', fontFamily: 'monospace' }}>{driver.phone || 'N/A'}</span>
                        </div>
                        {driver.email && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: '600', color: '#64748b' }}>Email:</span>
                            <span style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.76rem' }}>{driver.email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
                      <button className="tm-btn tm-btn-secondary" style={{ flex: 1, padding: '0.45rem 0.5rem', fontSize: '0.78rem' }} onClick={() => handleOpenEditDriver(driver)}>
                        <Edit size={14} /> Edit
                      </button>
                      <button className="tm-btn tm-btn-secondary" style={{ flex: 1, padding: '0.45rem 0.5rem', fontSize: '0.78rem', color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => handleDeleteDriver(driver)}>
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            {drivers.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem 1rem', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#64748b' }}>
                <UserCheck size={40} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
                <p style={{ fontWeight: '700', margin: 0 }}>No drivers found</p>
                <p style={{ fontSize: '0.82rem', margin: '0.25rem 0 0 0' }}>Click "+ Add Driver" to create a new transport driver.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'Attendance' && (
        <div className="animate-fade-in tm-panel">
          <div className="tm-panel-header">
            <h2 className="tm-panel-title">Driver Attendance Logs</h2>
            <div className="tm-search-box">
              <Search size={16} />
              <input
                type="text"
                className="tm-input"
                placeholder="Search driver, route, or date..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
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
                  .filter(log =>
                    (log.driverName || '').toLowerCase().includes(search.toLowerCase()) ||
                    (log.displayDriverId || '').toLowerCase().includes(search.toLowerCase()) ||
                    (log.assignedRoute || '').toLowerCase().includes(search.toLowerCase()) ||
                    (log.date || '').includes(search)
                  )
                  .map((log, index) => (
                    <tr key={`${log.driverId || index}-${index}`}>
                      <td style={{ fontWeight: '600' }}>
                        {log.date ? new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Today'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#eff6ff', color: '#2563eb', fontWeight: '800', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #bfdbfe' }}>
                            {(log.driverName || 'D').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {log.driverName}
                              {log.assignedRoute && (
                                <span className="tm-badge tm-badge-route">
                                  {log.assignedRoute}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                              <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>ID: {log.displayDriverId}</span>
                              {log.phone && <span style={{ fontFamily: 'monospace' }}>• {log.phone}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontWeight: '700', color: '#16a34a' }}>
                        {log.checkInTime ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <Clock size={13} style={{ color: '#16a34a' }} />
                            {log.checkInTime}
                          </span>
                        ) : '-'}
                      </td>
                      <td style={{ fontFamily: 'monospace', color: '#64748b' }}>
                        {log.checkOutTime ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <Clock size={13} style={{ color: '#94a3b8' }} />
                            {log.checkOutTime}
                          </span>
                        ) : '-'}
                      </td>
                      <td>
                        <span className={`tm-badge ${log.status === 'Present' ? 'tm-badge-paid' :
                          log.status === 'On Leave' ? 'tm-badge-route' : 'tm-badge-pending'
                          }`}>
                          {log.status || 'Present'}
                        </span>
                      </td>
                    </tr>
                  ))}
                {driverAttendanceLogs.length === 0 && (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No attendance records found. Drivers can check in via their dashboard.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'Reports' && (
        <div className="animate-fade-in tm-panel" style={{ padding: '3rem 1.5rem', textAlign: 'center', alignItems: 'center' }}>
          <FileText size={48} style={{ color: '#94a3b8', opacity: 0.6, marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: '0 0 0.5rem 0' }}>Transport Reports Generator</h2>
          <p style={{ color: '#64748b', maxWidth: '440px', margin: '0 0 1.5rem 0', fontSize: '0.88rem' }}>Export route-wise student lists, fee defaulter reports, and driver attendance logs to Excel/CSV.</p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button className="tm-btn tm-btn-primary" onClick={handleViewManifest}><FileText size={16} /> View Student Manifest</button>
            <button className="tm-btn tm-btn-secondary" onClick={handleViewDefaulters}><FileText size={16} /> View Defaulters List</button>
          </div>
        </div>
      )}

      {/* Report Preview Modal */}
      {reportModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '960px', width: '95vw' }}>
            <div className="modal-header">
              <h2 className="modal-title">{reportModal.title}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  className="tm-btn tm-btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem' }}
                  onClick={() => downloadCSV(reportModal.filename, [reportModal.headers, ...reportModal.rows])}
                >
                  <Download size={14} /> Download CSV
                </button>
                <button className="modal-close-btn" onClick={() => setReportModal({ ...reportModal, isOpen: false })}>✕</button>
              </div>
            </div>
            <div className="modal-body" style={{ padding: '1.25rem' }}>
              <div className="tm-table-container" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                <table className="tm-table">
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
                        <td colSpan={reportModal.headers.length} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                          No records found for this report.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="tm-btn tm-btn-secondary" onClick={() => setReportModal({ ...reportModal, isOpen: false })}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Student Modal */}
      {showAssignModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h2 className="modal-title">Assign Student to Transport</h2>
              <button className="modal-close-btn" onClick={() => setShowAssignModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAssignStudent}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Student ID (Roll No)</label>
                  <input type="text" required placeholder="e.g., CS2022001" className="input-field" value={assignForm.studentId} onChange={e => setAssignForm({ ...assignForm, studentId: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Student Name</label>
                  <input type="text" required placeholder="e.g., John Doe" className="input-field" value={assignForm.name} onChange={e => setAssignForm({ ...assignForm, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Route</label>
                  <select className="input-field" required value={assignForm.routeId} onChange={e => setAssignForm({ ...assignForm, routeId: e.target.value })}>
                    <option value="">Select Route</option>
                    {routes.map(r => (
                      <option key={r.routeId} value={r.routeId}>{r.routeId} - {r.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Pickup Point</label>
                  <input type="text" required placeholder="e.g., City Mall" className="input-field" value={assignForm.pickupPoint} onChange={e => setAssignForm({ ...assignForm, pickupPoint: e.target.value })} />
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label>Fee Status</label>
                    <select className="input-field" value={assignForm.feeStatus} onChange={e => setAssignForm({ ...assignForm, feeStatus: e.target.value })}>
                      <option value="Pending">Pending</option>
                      <option value="Paid">Paid</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Amount (₹)</label>
                    <input type="number" required placeholder="15000" className="input-field" value={assignForm.amount} onChange={e => setAssignForm({ ...assignForm, amount: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="tm-btn tm-btn-secondary" onClick={() => setShowAssignModal(false)}>Cancel</button>
                <button type="submit" className="tm-btn tm-btn-primary">Assign Student</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Route Modal */}
      {showRouteModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h2 className="modal-title">Create New Route</h2>
              <button className="modal-close-btn" onClick={() => setShowRouteModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateRoute}>
              <div className="modal-body">
                <div className="grid-2">
                  <div className="form-group">
                    <label>Route ID</label>
                    <input type="text" required placeholder="e.g., R-01" className="input-field" value={routeForm.routeId} onChange={e => setRouteForm({ ...routeForm, routeId: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Route Name</label>
                    <input type="text" required placeholder="e.g., North City" className="input-field" value={routeForm.name} onChange={e => setRouteForm({ ...routeForm, name: e.target.value })} />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label>Vehicle (Bus No)</label>
                    <input type="text" required placeholder="e.g., TN 01 AB 1234" className="input-field" value={routeForm.vehicle} onChange={e => setRouteForm({ ...routeForm, vehicle: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Driver Name</label>
                    <select className="input-field" required value={routeForm.driver} onChange={e => setRouteForm({ ...routeForm, driver: e.target.value })}>
                      <option value="">Select Driver</option>
                      {drivers.filter(d => d.status === 'Active').map(d => (
                        <option key={d.driverId} value={d.name}>{d.name} ({d.driverId})</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Seating Capacity</label>
                  <input type="number" required placeholder="50" className="input-field" value={routeForm.capacity} onChange={e => setRouteForm({ ...routeForm, capacity: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Route Points (Comma separated)</label>
                  <textarea required placeholder="Stop A, Stop B, Stop C" className="input-field" rows="3" value={routeForm.points} onChange={e => setRouteForm({ ...routeForm, points: e.target.value })}></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="tm-btn tm-btn-secondary" onClick={() => setShowRouteModal(false)}>Cancel</button>
                <button type="submit" className="tm-btn tm-btn-primary">Create Route</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Driver Modal */}
      {showDriverModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h2 className="modal-title">{editingDriver ? 'Edit Driver Details' : 'Add New Driver'}</h2>
              <button className="modal-close-btn" onClick={() => { setShowDriverModal(false); setEditingDriver(null); }}>✕</button>
            </div>
            <form onSubmit={handleSaveDriverSubmit}>
              <div className="modal-body">
                <div className="grid-2">
                  <div className="form-group">
                    <label>Driver ID</label>
                    <input type="text" required placeholder="e.g., D-101" className="input-field" value={driverForm.driverId} onChange={e => setDriverForm({ ...driverForm, driverId: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Driver Name</label>
                    <input type="text" required placeholder="e.g., Ramesh Kumar" className="input-field" value={driverForm.name} onChange={e => setDriverForm({ ...driverForm, name: e.target.value })} />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label>Experience</label>
                    <input type="text" required placeholder="e.g., 5 Years" className="input-field" value={driverForm.experience} onChange={e => setDriverForm({ ...driverForm, experience: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>License No.</label>
                    <input type="text" required placeholder="e.g., TN-XX-XXXX" className="input-field" value={driverForm.license} onChange={e => setDriverForm({ ...driverForm, license: e.target.value })} />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label>Email (for Login)</label>
                    <input type="email" required placeholder="e.g., driver@college.edu" className="input-field" value={driverForm.email} onChange={e => setDriverForm({ ...driverForm, email: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Password {editingDriver && '(Leave blank to keep unchanged)'}</label>
                    <input type="password" placeholder="Enter password" className="input-field" value={driverForm.password} onChange={e => setDriverForm({ ...driverForm, password: e.target.value })} />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input type="text" required placeholder="e.g., +91 9876543210" className="input-field" value={driverForm.phone} onChange={e => setDriverForm({ ...driverForm, phone: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select className="input-field" value={driverForm.status} onChange={e => setDriverForm({ ...driverForm, status: e.target.value })}>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="tm-btn tm-btn-secondary" onClick={() => { setShowDriverModal(false); setEditingDriver(null); }}>Cancel</button>
                <button type="submit" className="tm-btn tm-btn-primary">{editingDriver ? 'Save Changes' : 'Add Driver'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Points Modal */}
      {showEditPointsModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h2 className="modal-title">Edit Route Points</h2>
              <button className="modal-close-btn" onClick={() => setShowEditPointsModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSavePoints}>
              <div className="modal-body">
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
              </div>
              <div className="modal-footer">
                <button type="button" className="tm-btn tm-btn-secondary" onClick={() => setShowEditPointsModal(false)}>Cancel</button>
                <button type="submit" className="tm-btn tm-btn-primary">Save Points</button>
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
              <h2 className="modal-title">Change Vehicle & Driver</h2>
              <button className="modal-close-btn" onClick={() => setShowChangeBusModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveBus}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Vehicle (Bus No)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., TN 01 AB 1234"
                    className="input-field"
                    value={changeBusForm.vehicle}
                    onChange={e => setChangeBusForm({ ...changeBusForm, vehicle: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Driver Name</label>
                  <select
                    className="input-field"
                    required
                    value={changeBusForm.driver}
                    onChange={e => setChangeBusForm({ ...changeBusForm, driver: e.target.value })}
                  >
                    <option value="">Select Driver</option>
                    {drivers.filter(d => d.status === 'Active').map(d => (
                      <option key={d.driverId} value={d.name}>{d.name} ({d.driverId})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="tm-btn tm-btn-secondary" onClick={() => setShowChangeBusModal(false)}>Cancel</button>
                <button type="submit" className="tm-btn tm-btn-primary">Save Changes</button>
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
          <div className="modal-card">
            <div className="modal-header">
              <h2 className="modal-title">Schedule Vehicle Maintenance</h2>
              <button className="modal-close-btn" onClick={() => setShowMaintModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateMaintenance}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Vehicle (Bus) Number</label>
                  <select className="input-field" required value={maintForm.vehicleNumber} onChange={e => setMaintForm({ ...maintForm, vehicleNumber: e.target.value })}>
                    <option value="">Select Vehicle</option>
                    {routes.map(r => (
                      <option key={r.routeId} value={r.vehicle}>{r.vehicle} (Route {r.routeId})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Service Type</label>
                  <select className="input-field" value={maintForm.serviceType} onChange={e => setMaintForm({ ...maintForm, serviceType: e.target.value })}>
                    <option value="General">General Service</option>
                    <option value="Oil Change">Oil Change</option>
                    <option value="Brake Service">Brake Service</option>
                    <option value="Tire Replacement">Tire Replacement</option>
                    <option value="Engine Repair">Engine Repair</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Service Date</label>
                  <input type="date" required className="input-field" value={maintForm.serviceDate} onChange={e => setMaintForm({ ...maintForm, serviceDate: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Remarks / Instructions</label>
                  <textarea rows="3" className="input-field" placeholder="e.g. Driver reported steering tightness..." value={maintForm.remarks} onChange={e => setMaintForm({ ...maintForm, remarks: e.target.value })}></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="tm-btn tm-btn-secondary" onClick={() => setShowMaintModal(false)}>Cancel</button>
                <button type="submit" className="tm-btn tm-btn-primary">Schedule Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Complaint / Task Modal */}
      {showComplaintModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h2 className="modal-title">Assign Task / Complaint to Driver</h2>
              <button className="modal-close-btn" onClick={() => setShowComplaintModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateComplaint}>
              <div className="modal-body">
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
                <div className="form-group">
                  <label>Student Name</label>
                  <input type="text" readOnly className="input-field" style={{ background: '#f8fafc', color: '#64748b' }} value={complaintForm.name} />
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label>Bus Number</label>
                    <input type="text" readOnly className="input-field" style={{ background: '#f8fafc', color: '#64748b' }} value={complaintForm.busNumber} />
                  </div>
                  <div className="form-group">
                    <label>Route ID</label>
                    <input type="text" readOnly className="input-field" style={{ background: '#f8fafc', color: '#64748b' }} value={complaintForm.routeId} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Driver Assignment</label>
                  <select className="input-field" required value={complaintForm.assignedTo} onChange={e => setComplaintForm({ ...complaintForm, assignedTo: e.target.value })}>
                    <option value="">Select Driver</option>
                    {drivers.map(d => (
                      <option key={d.driverId} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Complaint/Task Category</label>
                  <select className="input-field" value={complaintForm.complaintType} onChange={e => setComplaintForm({ ...complaintForm, complaintType: e.target.value })}>
                    <option value="General">General Assistance</option>
                    <option value="Route Delay">Route Delay Issue</option>
                    <option value="Student Behavior">Student Behavior Incident</option>
                    <option value="Maintenance Request">Maintenance Request</option>
                    <option value="Lost Item">Lost Item Inquiry</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Description / Details</label>
                  <textarea rows="3" required className="input-field" placeholder="Provide detailed instructions or complaint details..." value={complaintForm.description} onChange={e => setComplaintForm({ ...complaintForm, description: e.target.value })}></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="tm-btn tm-btn-secondary" onClick={() => setShowComplaintModal(false)}>Cancel</button>
                <button type="submit" className="tm-btn tm-btn-primary">Assign Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default TransportManagement;



