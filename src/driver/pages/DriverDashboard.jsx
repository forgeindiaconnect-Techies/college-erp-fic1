import React, { useState, useEffect, useCallback } from 'react';
import { 
  Bus, MapPin, Users, Calendar, Navigation, Shield, AlertTriangle, 
  Clock, CheckCircle, ArrowRight, Play, Check, RotateCcw, 
  PhoneCall, ShieldAlert, Sparkles, Activity, Bell, Fuel, Gauge,
  Compass, ChevronRight, ShieldCheck, Zap, IndianRupee, CheckSquare, Wrench
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  getTransportDrivers, getTransportRoutes, getTransportStudents, 
  getDriverAttendance, getTransportVehicles, createTransportTrip, 
  getTransportTrips, updateTransportTrip 
} from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import EmployeeAttendanceCard from '../../components/common/EmployeeAttendanceCard';
import './DriverDashboard.css';

const DriverDashboard = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [currentStopIndex, setCurrentStopIndex] = useState(0);

  const [dashboardData, setDashboardData] = useState({
    driver: null,
    vehicle: null,
    route: null,
    students: [],
    attendance: null,
    vehicleDetails: null
  });

  const [tripStatus, setTripStatus] = useState(
    localStorage.getItem('driver_trip_status') || 'SCHEDULED'
  );

  // Live Digital Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const updateTripStatus = async (status) => {
    setTripStatus(status);
    localStorage.setItem('driver_trip_status', status);

    // Sync trip state to backend if driver and route exist
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const payload = {
        driverId: dashboardData.driver?.driverId || session.referenceId || session._id || 'DRIVER',
        vehicleId: dashboardData.vehicle?.vehicleNumber || dashboardData.vehicle?.vehicleId || 'Unassigned',
        routeId: dashboardData.route?.routeId || 'Unassigned',
        date: todayStr,
        status: status === 'IN TRANSIT' ? 'Started' : status === 'ARRIVED' ? 'Arrived' : status === 'COMPLETED' ? 'Completed' : 'Scheduled'
      };
      await createTransportTrip(payload).catch(() => {});
    } catch (e) {
      console.warn('Trip sync notice:', e);
    }
  };

  const fetchDashboard = useCallback(async () => {
    try {
      const data = JSON.parse(sessionStorage.getItem('driver_session') || '{}');
      setSession(data);
      
      const driverId = data.referenceId || data._id;
      const tenantId = data.tenantId || 'mock_college_id';

      // Multi-key local storage scraper to prevent tenant ID key mismatches
      const scanLocalStorage = (keyPrefix) => {
        let items = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(keyPrefix)) {
            try {
              const parsed = JSON.parse(localStorage.getItem(key) || '[]');
              if (Array.isArray(parsed)) items.push(...parsed);
            } catch (e) {}
          }
        }
        return items;
      };

      const localDrivers = [
        ...JSON.parse(localStorage.getItem(`erp_transport_drivers_${tenantId}`) || '[]'),
        ...scanLocalStorage('erp_transport_drivers')
      ];
      const localRoutes  = [
        ...JSON.parse(localStorage.getItem(`erp_transport_routes_${tenantId}`)  || '[]'),
        ...scanLocalStorage('erp_transport_routes')
      ];
      const localStudents = [
        ...JSON.parse(localStorage.getItem(`erp_transport_students_${tenantId}`) || '[]'),
        ...scanLocalStorage('erp_transport_students')
      ];
      const localVehicles = [
        ...JSON.parse(localStorage.getItem(`erp_transport_vehicles_${tenantId}`) || '[]'),
        ...scanLocalStorage('erp_transport_vehicles')
      ];

      // Fetch latest from API
      const [driversRes, routesRes, studentsRes, vehiclesRes, attendanceRes] = await Promise.all([
        getTransportDrivers().catch(() => ({ data: [] })),
        getTransportRoutes().catch(() => ({ data: [] })),
        getTransportStudents().catch(() => ({ data: [] })),
        getTransportVehicles().catch(() => ({ data: [] })),
        getDriverAttendance({ driverId }).catch(() => ({ data: [] }))
      ]);

      const DEFAULT_ROUTES = [
        {
          _id: 'route_east_01',
          routeId: 'R-01',
          name: 'East',
          vehicle: 'TN 01 AB 1234',
          driver: 'Viji',
          capacity: 50,
          occupied: 0,
          points: ['Stop A', 'Stop B', 'Stop C', 'Stop D', 'College Campus']
        }
      ];

      const combinedRoutesRaw = [
        ...localRoutes,
        ...(routesRes.data || []),
        ...DEFAULT_ROUTES
      ];
      const allRoutes = Array.from(new Map(combinedRoutesRaw.map(r => [r.routeId || r._id || r.name, r])).values());

      const combinedDriversRaw = [
        ...localDrivers,
        ...(driversRes.data || []),
        { _id: 'drv_viji', driverId: 'DRV-001', name: 'Viji', vehicleNumber: 'TN 01 AB 1234', email: 'driver@college.edu', status: 'Active' }
      ];
      const allDrivers = Array.from(new Map(combinedDriversRaw.map(d => [d.driverId || d._id || d.name, d])).values());

      const allStudents = [
        ...localStudents,
        ...(studentsRes.data || []).filter(s => !localStudents.find(l => l.studentId === s.studentId))
      ];
      const allVehicles = [
        ...localVehicles,
        ...(vehiclesRes.data || []).filter(v => !localVehicles.find(l => l.vehicleId === v.vehicleId))
      ];

      // Robust multi-key driver matching
      const cleanStr = (str) => (str || '').toString().trim().toLowerCase();
      const me = allDrivers.find(d => 
        (d.driverId && (cleanStr(d.driverId) === cleanStr(driverId) || cleanStr(d.driverId) === cleanStr(data.referenceId))) ||
        (d.email && cleanStr(d.email) === cleanStr(data.email)) ||
        (d.phone && cleanStr(d.phone).replace(/\s+/g, '') === cleanStr(driverId).replace(/\s+/g, '')) ||
        (d.name && (cleanStr(d.name) === cleanStr(data.name) || cleanStr(d.name) === cleanStr(driverId))) ||
        (d._id && (cleanStr(d._id) === cleanStr(driverId) || cleanStr(d._id) === cleanStr(data.referenceId)))
      );

      const meName = cleanStr(me?.name || data.name || data.driverName || data.userName || 'viji');
      const meId = cleanStr(me?.driverId || data.referenceId || data.id || data.driverId);
      const meEmail = cleanStr(me?.email || data.email);
      const meVehicle = cleanStr(me?.vehicleNumber || me?.assignedVehicle || data.vehicleNumber || data.vehicle);

      // Route matching
      let myRoute = allRoutes.find(r => {
        const rDriver = cleanStr(r.driver);
        const rVehicle = cleanStr(r.vehicle);

        if (rDriver) {
          if (meName && (rDriver === meName || rDriver.includes(meName) || meName.includes(rDriver))) return true;
          if (meId && (rDriver.includes(meId) || rDriver === meId)) return true;
          if (meEmail && (rDriver.includes(meEmail) || rDriver === meEmail)) return true;
        }

        if (rVehicle && meVehicle && (rVehicle === meVehicle || rVehicle.includes(meVehicle) || meVehicle.includes(rVehicle))) return true;

        if (me?.routeId && (cleanStr(r.routeId) === cleanStr(me.routeId) || cleanStr(r.name) === cleanStr(me.routeId))) return true;
        if (data.routeId && (cleanStr(r.routeId) === cleanStr(data.routeId) || cleanStr(r.name) === cleanStr(data.routeId))) return true;

        return false;
      });

      if (!myRoute && allRoutes.length > 0) {
        myRoute = allRoutes.find(r => {
          const rDriver = cleanStr(r.driver);
          return rDriver && meName && (rDriver.includes(meName) || meName.includes(rDriver));
        }) || allRoutes[0];
      }

      const vehicleKey = myRoute ? myRoute.vehicle : (me?.vehicleId || me?.vehicle || null);
      
      let matchedVehicle = null;
      if (vehicleKey && vehicleKey !== 'Unassigned') {
        matchedVehicle = allVehicles.find(v => 
          cleanStr(v.vehicleNumber) === cleanStr(vehicleKey) ||
          cleanStr(v.vehicleId) === cleanStr(vehicleKey) ||
          cleanStr(v.registrationNumber) === cleanStr(vehicleKey)
        ) || {
          vehicleNumber: vehicleKey,
          vehicleId: vehicleKey,
          capacity: myRoute?.capacity || 50,
          status: 'Active',
          maintenanceStatus: 'Good'
        };
      }

      const myStudents = myRoute 
        ? allStudents.filter(s => s.routeId === myRoute.routeId || cleanStr(s.routeId) === cleanStr(myRoute.name)) 
        : [];

      const todayStr = new Date().toISOString().split('T')[0];
      const attendanceData = Array.isArray(attendanceRes.data) ? attendanceRes.data : [];
      const myAttendance = attendanceData.find(a => a.date === todayStr);

      setDashboardData({
        driver: me,
        vehicle: matchedVehicle,
        route: myRoute,
        students: myStudents,
        attendance: myAttendance,
        vehicleDetails: matchedVehicle
      });
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useRealtimeSync(fetchDashboard, ['transport', 'users', 'students', 'attendance']);

  const driverDisplayName = dashboardData.driver?.name || session.name || 'Driver';
  const driverDisplayId = dashboardData.driver?.driverId || session.referenceId || 'DRV-0002';

  const stops = dashboardData.route?.points || ['Campus Gate', 'North Junction', 'Main Depot'];
  const capacity = dashboardData.route?.capacity || dashboardData.vehicle?.capacity || 50;
  const boardingCount = dashboardData.students.length;
  const boardingPercentage = Math.min(100, Math.round((boardingCount / capacity) * 100));

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#2563eb', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid #e0e7ff', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '0.75rem' }}></div>
        <p style={{ fontWeight: 600, fontSize: '0.88rem', color: '#475569' }}>Connecting Real-Time Fleet Systems...</p>
      </div>
    );
  }

  return (
    <div className="driver-page-container">
      
      {/* ── Breadcrumb & ERP Header ── */}
      <div className="driver-header-bar">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '0.2rem' }}>
            <span>Fleet Operations</span>
            <ChevronRight size={12} />
            <span style={{ color: '#0f172a' }}>Command Center</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.01em' }}>
              Driver Command Center
            </h1>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '0.15rem 0.6rem', background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#16a34a' }}></span>
              LIVE GPS ONLINE
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600, background: '#f8fafc', padding: '0.25rem 0.65rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
            ⏰ {currentTime}
          </span>
          <span style={{ fontSize: '0.78rem', color: '#2563eb', fontWeight: 700, background: '#eff6ff', padding: '0.25rem 0.65rem', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
            ID: {driverDisplayId}
          </span>
        </div>
      </div>

      {/* ── Daily Duty Attendance (Single Source of Truth Check-In / Check-Out) ── */}
      <div style={{ marginBottom: '1.25rem' }}>
        <EmployeeAttendanceCard layout="bar" />
      </div>

      {/* ── 4 KPI Status Cards (Single Source of Truth) ── */}
      <div className="driver-kpi-grid">
        
        {/* Assigned Vehicle */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
            <span>Assigned Vehicle</span>
            <Bus size={14} style={{ color: '#2563eb' }} />
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem', fontFamily: 'monospace' }}>
            {dashboardData.vehicle?.vehicleNumber || 'TN 01 AD 1234'}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600, marginTop: '0.15rem' }}>
            ● Vehicle Ready (Cap: {capacity})
          </div>
        </div>

        {/* Assigned Route */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
            <span>Assigned Route</span>
            <MapPin size={14} style={{ color: '#4f46e5' }} />
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>
            Route {dashboardData.route?.name || 'EAST'}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 600, marginTop: '0.15rem' }}>
            {stops.length} Scheduled Stops
          </div>
        </div>

        {/* Passenger Load */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
            <span>Passenger Load</span>
            <Users size={14} style={{ color: '#16a34a' }} />
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>
            {boardingCount} <span style={{ fontSize: '0.8rem', color: '#64748b' }}>/ {capacity}</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600, marginTop: '0.15rem' }}>
            {boardingPercentage}% Capacity Occupied
          </div>
        </div>

        {/* Duty Status */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
            <span>Duty Status</span>
            <Clock size={14} style={{ color: '#0284c7' }} />
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: tripStatus === 'COMPLETED' ? '#166534' : tripStatus === 'IN TRANSIT' ? '#2563eb' : tripStatus === 'ARRIVED' ? '#16a34a' : '#b45309', marginTop: '0.2rem' }}>
            {tripStatus}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginTop: '0.15rem' }}>
            {tripStatus === 'IN TRANSIT' ? 'En Route to Stops' : tripStatus === 'ARRIVED' ? 'At Destination' : tripStatus === 'COMPLETED' ? 'Shift Concluded' : 'Ready to Start'}
          </div>
        </div>

      </div>

      {/* Driver Operations Quick Actions Hub */}
      <div style={{
        background: 'var(--bg-primary, #ffffff)',
        border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: '12px',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.25rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 28, height: 28, borderRadius: '8px', background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={16} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                Fleet Operations Quick Actions
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>
                Immediate shortcuts for transit dispatch, route stops, vehicle health, and student roster
              </p>
            </div>
          </div>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}>
            Driver Shortcuts
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          <button 
            type="button"
            onClick={() => navigate('/driver/trip')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', background: 'var(--bg-secondary, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease' }}
          >
            <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(37, 99, 235, 0.12)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Navigation size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-main, #0f172a)' }}>Trip Management</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748b)' }}>Live trip controls</div>
            </div>
          </button>

          <button 
            type="button"
            onClick={() => navigate('/driver/vehicle')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', background: 'var(--bg-secondary, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease' }}
          >
            <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Bus size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-main, #0f172a)' }}>Vehicle Health</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748b)' }}>Bus specs & fuel log</div>
            </div>
          </button>

          <button 
            type="button"
            onClick={() => navigate('/driver/route')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', background: 'var(--bg-secondary, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease' }}
          >
            <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(245, 158, 11, 0.12)', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MapPin size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-main, #0f172a)' }}>Route & Waypoints</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748b)' }}>Scheduled pick-up stops</div>
            </div>
          </button>

          <button 
            type="button"
            onClick={() => navigate('/driver/students')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', background: 'var(--bg-secondary, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease' }}
          >
            <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(147, 51, 234, 0.12)', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Users size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-main, #0f172a)' }}>Passenger Roster</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748b)' }}>Student boarding list</div>
            </div>
          </button>

          <button 
            type="button"
            onClick={() => navigate('/driver/tasks')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', background: 'var(--bg-secondary, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease' }}
          >
            <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CheckSquare size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-main, #0f172a)' }}>Shift Tasks</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748b)' }}>Daily duty checklist</div>
            </div>
          </button>

          <button 
            type="button"
            onClick={() => navigate('/driver/payroll')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', background: 'var(--bg-secondary, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease' }}
          >
            <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <IndianRupee size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-main, #0f172a)' }}>Duty Payroll</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748b)' }}>Salary slips & payslips</div>
            </div>
          </button>
        </div>
      </div>

      {/* ── Main Operations Layout (Stacked on Mobile, 2 Columns on Desktop) ── */}
      <div className="driver-two-col-grid">
        
        {/* Left Column: Shift Operations & Scheduled Stops */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Active Shift Action Bar */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Navigation size={15} style={{ color: '#2563eb' }} /> Shift Dispatch Controls
              </h3>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '4px', background: tripStatus === 'COMPLETED' ? '#dcfce7' : tripStatus === 'IN TRANSIT' ? '#dbeafe' : '#fef3c7', color: tripStatus === 'COMPLETED' ? '#166534' : tripStatus === 'IN TRANSIT' ? '#1d4ed8' : '#b45309' }}>
                ● {tripStatus}
              </span>
            </div>

            <div style={{ padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
              {tripStatus === 'SCHEDULED' && (
                <button 
                  onClick={() => updateTripStatus('IN TRANSIT')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.1rem', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  <Play size={14} /> Start Transit Shift
                </button>
              )}

              {tripStatus === 'IN TRANSIT' && (
                <button 
                  onClick={() => updateTripStatus('ARRIVED')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.1rem', background: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  <Check size={14} /> Mark Arrived at Destination
                </button>
              )}

              {tripStatus === 'ARRIVED' && (
                <button 
                  onClick={() => updateTripStatus('COMPLETED')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.1rem', background: '#7c3aed', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  <CheckCircle size={14} /> Complete & Conclude Trip
                </button>
              )}

              {tripStatus === 'COMPLETED' && (
                <button 
                  onClick={() => updateTripStatus('SCHEDULED')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.1rem', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  <RotateCcw size={14} /> Reset Shift Duty
                </button>
              )}

              <Link 
                to="/driver/students" 
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', background: '#ffffff', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 700, fontSize: '0.82rem', textDecoration: 'none' }}
              >
                <Users size={14} /> Student Manifest ({boardingCount})
              </Link>

              <Link 
                to="/driver/route" 
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', background: '#ffffff', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 700, fontSize: '0.82rem', textDecoration: 'none' }}
              >
                <MapPin size={14} /> View Route Map
              </Link>
            </div>
          </div>

          {/* Scheduled Route Stops Timeline */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <MapPin size={15} style={{ color: '#2563eb' }} /> Scheduled Waypoint Sequence
              </h3>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{stops.length} Waypoints</span>
            </div>

            <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {stops && stops.length > 0 ? (
                stops.map((stop, index) => {
                  const studentsAtStop = dashboardData.students.filter(s => s.pickupPoint === stop).length;
                  const isCurrent = index === currentStopIndex;
                  const isPassed = index < currentStopIndex;

                  return (
                    <div 
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.55rem 0.85rem',
                        borderRadius: '6px',
                        border: isCurrent ? '1px solid #bfdbfe' : '1px solid #f1f5f9',
                        background: isCurrent ? '#eff6ff' : isPassed ? '#f8fafc' : '#ffffff'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: isPassed ? '#dcfce7' : isCurrent ? '#2563eb' : '#e2e8f0',
                          color: isPassed ? '#166534' : isCurrent ? '#ffffff' : '#64748b',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {isPassed ? '✓' : index + 1}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>{stop}</div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                            👥 {studentsAtStop} Boarding Students
                          </div>
                        </div>
                      </div>

                      <div>
                        {isCurrent ? (
                          <button 
                            onClick={() => setCurrentStopIndex(prev => Math.min(stops.length - 1, prev + 1))}
                            style={{ padding: '0.2rem 0.55rem', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            Mark Passed ➔
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: isPassed ? '#16a34a' : '#94a3b8' }}>
                            {isPassed ? 'Passed' : 'Scheduled'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.82rem' }}>
                  No stops defined for this route.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Attendance & Vehicle Diagnostic */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Employee Attendance Punch Card */}
          <EmployeeAttendanceCard layout="card" />

          {/* Vehicle Diagnostic Summary */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ShieldCheck size={15} style={{ color: '#16a34a' }} /> Vehicle Compliance
              </h3>
              <Link to="/driver/vehicle" style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2563eb', textDecoration: 'none' }}>
                Full Record ➔
              </Link>
            </div>

            <div style={{ padding: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.5rem', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Condition</div>
                  <strong style={{ fontSize: '0.82rem', color: '#16a34a' }}>{dashboardData.vehicle?.maintenanceStatus || 'Certified Safe'}</strong>
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.5rem', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Next Service</div>
                  <strong style={{ fontSize: '0.82rem', color: '#0f172a' }}>In 15 Days</strong>
                </div>
              </div>

              <Link 
                to="/driver/vehicle" 
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', width: '100%', padding: '0.45rem', borderRadius: '6px', background: '#ffffff', color: '#dc2626', border: '1px solid #fca5a5', fontWeight: 700, fontSize: '0.78rem', textDecoration: 'none' }}
              >
                <ShieldAlert size={13} /> Report Maintenance Defect
              </Link>
            </div>
          </div>

          {/* Dispatch Hotline Card */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <PhoneCall size={15} style={{ color: '#d97706' }} /> Support Hotline
              </h3>
            </div>

            <div style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.4rem', borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>Transport Control Desk</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Dispatch & Coordination</div>
                </div>
                <a href="tel:9876543210" style={{ padding: '0.25rem 0.55rem', background: '#eff6ff', color: '#1d4ed8', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, textDecoration: 'none', border: '1px solid #bfdbfe' }}>
                  📞 Call
                </a>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>Campus Security Emergency</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>SOS Response</div>
                </div>
                <a href="tel:9876543211" style={{ padding: '0.25rem 0.55rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, textDecoration: 'none', border: '1px solid #fecaca' }}>
                  🚨 SOS
                </a>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default DriverDashboard;
