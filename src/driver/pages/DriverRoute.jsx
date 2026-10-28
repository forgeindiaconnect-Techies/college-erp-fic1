import React, { useState, useEffect } from 'react';
import { 
  MapPin, Navigation, Clock, Users, ArrowRight, AlertTriangle, 
  Route as RouteIcon, Target, Activity, ChevronRight, Bus, 
  Phone, UserCheck, Search, ShieldCheck, Download, ExternalLink, Compass, RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getTransportRoutes, getTransportStudents, getTransportDrivers, getTransportVehicles, getStudentTransportAttendanceReport } from '../../api/index';
import './DriverDashboard.css';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DriverRoute = () => {
  const [session, setSession] = useState({});
  const [driverInfo, setDriverInfo] = useState(null);
  const [route, setRoute] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendanceReport, setAttendanceReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStopFilter, setSelectedStopFilter] = useState('ALL');
  const [liveTime, setLiveTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchRouteData = async () => {
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

        const [driversRes, routesRes, studentsRes, vehiclesRes] = await Promise.all([
          getTransportDrivers().catch(() => ({ data: [] })),
          getTransportRoutes().catch(() => ({ data: [] })),
          getTransportStudents().catch(() => ({ data: [] })),
          getTransportVehicles().catch(() => ({ data: [] }))
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

        const cleanStr = (str) => (str || '').toString().trim().toLowerCase();
        const me = allDrivers.find(d => 
          (d.driverId && (cleanStr(d.driverId) === cleanStr(driverId) || cleanStr(d.driverId) === cleanStr(data.referenceId))) ||
          (d.email && cleanStr(d.email) === cleanStr(data.email)) ||
          (d.phone && cleanStr(d.phone).replace(/\s+/g, '') === cleanStr(driverId).replace(/\s+/g, '')) ||
          (d.name && (cleanStr(d.name) === cleanStr(data.name) || cleanStr(d.name) === cleanStr(data.driverName) || cleanStr(d.name) === cleanStr(driverId))) ||
          (d._id && (cleanStr(d._id) === cleanStr(driverId) || cleanStr(d._id) === cleanStr(data.referenceId)))
        );
        setDriverInfo(me);

        const meName = cleanStr(me?.name || data.name || data.driverName || data.userName || 'viji');
        const meId = cleanStr(me?.driverId || data.referenceId || data.id || data.driverId);
        const meEmail = cleanStr(me?.email || data.email);
        const meVehicle = cleanStr(me?.vehicleNumber || me?.assignedVehicle || data.vehicleNumber || data.vehicle);

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

        setRoute(myRoute);

        if (myRoute) {
          const myStudents = allStudents.filter(s => s.routeId === myRoute.routeId || cleanStr(s.routeId) === cleanStr(myRoute.name) || cleanStr(s.driverName).includes(meName));
          setStudents(myStudents.length > 0 ? myStudents : allStudents);

          const matchingVeh = allVehicles.find(v => 
            cleanStr(v.vehicleNumber) === cleanStr(myRoute.vehicle) || 
            cleanStr(v.vehicleId) === cleanStr(myRoute.vehicle)
          ) || { vehicleNumber: myRoute.vehicle || 'TN 01 AB 1234', capacity: 50 };
          setVehicle(matchingVeh);

          try {
            const todayStr = new Date().toISOString().split('T')[0];
            const rep = await getStudentTransportAttendanceReport({
              routeId: myRoute.routeId || 'R-01',
              date: todayStr,
              tripType: 'Pickup'
            });
            if (rep?.data) setAttendanceReport(rep.data);
          } catch (e) {
            console.error('Failed to load attendance report:', e);
          }
        }
      } catch (err) {
        console.error('Failed to load route data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRouteData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#2563eb', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid #e0e7ff', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '0.75rem' }}></div>
        <p style={{ fontWeight: 600, fontSize: '0.88rem', color: '#475569' }}>Loading route master and manifest...</p>
      </div>
    );
  }

  if (!route) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '1440px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '0.5rem' }}>
          <span>Fleet Operations</span>
          <ChevronRight size={12} />
          <span style={{ color: '#0f172a' }}>Route Schedule</span>
        </div>
        <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '1.25rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#92400e' }}>
          <AlertTriangle size={20} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>No Active Route Assigned</div>
            <div style={{ fontSize: '0.8rem', color: '#b45309' }}>Please contact the central Transport Desk to bind your driver profile to an active route.</div>
          </div>
        </div>
      </div>
    );
  }

  const pointsList = Array.isArray(route.points) ? route.points : [];
  const startStop = pointsList.length > 0 ? pointsList[0] : 'Origin Point';
  const endStop = pointsList.length > 1 ? pointsList[pointsList.length - 1] : (pointsList[0] || 'College Campus');

  const getStudentCountForStop = (stopName) => {
    return students.filter(s => s.pickupPoint === stopName).length;
  };

  const filteredStudents = students.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.studentId.toLowerCase().includes(studentSearch.toLowerCase()) ||
      (s.pickupPoint && s.pickupPoint.toLowerCase().includes(studentSearch.toLowerCase()));
    
    const matchStop = selectedStopFilter === 'ALL' || s.pickupPoint === selectedStopFilter;
    return matchSearch && matchStop;
  });

  return (
    <div className="driver-page-container" style={{ maxWidth: '1440px', margin: '0 auto', fontFamily: 'Inter, -apple-system, sans-serif', color: '#0f172a' }}>
      
      {/* ── Enterprise Real-Time Header Bar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', background: '#ffffff', padding: '18px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Route Master: {route.name}
            </h1>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 700, color: '#047857', background: '#ecfdf5', padding: '4px 10px', borderRadius: '20px', border: '1px solid #a7f3d0' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }}></span>
              ACTIVE ROUTE ({route.routeId})
            </span>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem', fontWeight: 500 }}>
            Fleet Transit • Driver <strong>{driverInfo?.name || session.name || 'Driver'}</strong> ({driverInfo?.driverId || session.referenceId || 'DRV-0001'}) • Vehicle <strong>{route.vehicle || 'TN 01 AB 1234'}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <Link 
            to="/driver/trip"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '8px 14px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.82rem', textDecoration: 'none', cursor: 'pointer' }}
          >
            <Compass size={15} /> Start Trip Ops →
          </Link>
          <Link 
            to="/driver/students"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '8px 14px', backgroundColor: '#ffffff', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 700, fontSize: '0.82rem', textDecoration: 'none' }}
          >
            <Users size={15} /> Student Roster
          </Link>
          <button 
            onClick={() => window.location.reload()}
            title="Refresh Route Data"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', color: '#334155' }}
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      {/* ── 4 ERP Key Metric Cards ── */}
      <div className="driver-stats-grid driver-kpi-grid" style={{ marginBottom: '1.25rem' }}>
        
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #6366F1', padding: '16px 18px', borderRadius: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Operating Bus</span>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px', fontFamily: 'monospace' }}>
                {route.vehicle || 'TN 01 AB 1234'}
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(99, 102, 241, 0.1)', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bus size={22} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', fontSize: '0.75rem' }}>
            <span style={{ color: '#16a34a', fontWeight: 700 }}>● Capacity: {route.capacity || 50} Seats</span>
            <span style={{ color: '#6366F1', fontWeight: 700 }}>Vehicle Specs →</span>
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #0284c7', padding: '16px 18px', borderRadius: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Stops & Waypoints</span>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px' }}>
                {pointsList.length} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Scheduled</span>
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MapPin size={22} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', fontSize: '0.75rem' }}>
            <span style={{ color: '#0284c7', fontWeight: 600 }}>Origin: {startStop}</span>
            <span style={{ color: '#0284c7', fontWeight: 700 }}>Sequence →</span>
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #F59E0B', padding: '16px 18px', borderRadius: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Passenger Load</span>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px' }}>
                {students.length} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>/ {route.capacity || 50}</span>
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={22} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', fontSize: '0.75rem' }}>
            <span style={{ color: '#16a34a', fontWeight: 700 }}>{Math.round((students.length / (route.capacity || 50)) * 100)}% Booked</span>
            <span style={{ color: '#F59E0B', fontWeight: 700 }}>Roster →</span>
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #10B981', padding: '16px 18px', borderRadius: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Estimated Runtime</span>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px' }}>
                ~45 Minutes
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={22} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', fontSize: '0.75rem' }}>
            <span style={{ color: '#16a34a', fontWeight: 600 }}>● Regular Traffic Window</span>
            <span style={{ color: '#10B981', fontWeight: 700 }}>Live Dispatch →</span>
          </div>
        </div>

      </div>

      {/* ── Route Specs & Waypoints Split ── */}
      <div className="driver-two-col-grid-equal" style={{ marginBottom: '1.5rem' }}>
        
        {/* Left: Route Specification Sheet */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <RouteIcon size={15} style={{ color: '#2563eb' }} /> Route Parameters
            </h3>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.65rem 1rem', width: '40%', color: '#64748b', fontWeight: 600, background: '#fcfdfd' }}>Route Identifier</td>
                <td style={{ padding: '0.65rem 1rem', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>{route.routeId}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.65rem 1rem', color: '#64748b', fontWeight: 600, background: '#fcfdfd' }}>Route Title</td>
                <td style={{ padding: '0.65rem 1rem', fontWeight: 700, color: '#0f172a' }}>{route.name}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.65rem 1rem', color: '#64748b', fontWeight: 600, background: '#fcfdfd' }}>Starting Origin</td>
                <td style={{ padding: '0.65rem 1rem', color: '#16a34a', fontWeight: 700 }}>{startStop}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.65rem 1rem', color: '#64748b', fontWeight: 600, background: '#fcfdfd' }}>Terminal Destination</td>
                <td style={{ padding: '0.65rem 1rem', color: '#dc2626', fontWeight: 700 }}>{endStop}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.65rem 1rem', color: '#64748b', fontWeight: 600, background: '#fcfdfd' }}>Assigned Driver</td>
                <td style={{ padding: '0.65rem 1rem', color: '#0f172a', fontWeight: 700 }}>{session.name || 'Driver'}</td>
              </tr>
              <tr>
                <td style={{ padding: '0.65rem 1rem', color: '#64748b', fontWeight: 600, background: '#fcfdfd' }}>Assigned Bus</td>
                <td style={{ padding: '0.65rem 1rem', color: '#2563eb', fontWeight: 700, fontFamily: 'monospace' }}>{route.vehicle || 'TN 01 AD 1234'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Right: Waypoint Sequence Table */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Navigation size={15} style={{ color: '#2563eb' }} /> Scheduled Waypoint Sequence
            </h3>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{pointsList.length} Total Waypoints</span>
          </div>

          <div className="driver-table-wrapper" style={{ overflowX: 'auto' }}>
            <table className="driver-table" style={{ width: '100%', minWidth: '450px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '0.65rem 0.85rem', width: '45px', textAlign: 'center' }}>#</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Waypoint / Stop</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Type</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Boarding Count</th>
                </tr>
              </thead>
              <tbody>
                {pointsList.map((stop, index) => {
                  const stopRep = attendanceReport?.stopBreakdown?.find(sb => 
                    (sb.stopName || '').toLowerCase().trim() === (stop || '').toLowerCase().trim()
                  );
                  const expectedCount = stopRep ? stopRep.expectedStudents : getStudentCountForStop(stop);
                  const boardedCount = stopRep ? stopRep.boardedCount : 0;
                  const isFirst = index === 0;
                  const isLast = index === pointsList.length - 1;

                  return (
                    <tr key={index} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: selectedStopFilter === stop ? '#eff6ff' : 'transparent' }}>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: 700, color: '#64748b' }}>
                        {index + 1}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: '#0f172a' }}>
                        {stop}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                        <span style={{ 
                          fontSize: '0.7rem', 
                          fontWeight: 700, 
                          padding: '0.12rem 0.5rem', 
                          borderRadius: '4px',
                          background: isFirst ? '#dcfce7' : isLast ? '#fee2e2' : '#f1f5f9',
                          color: isFirst ? '#166534' : isLast ? '#991b1b' : '#475569',
                          border: isFirst ? '1px solid #bbf7d0' : isLast ? '1px solid #fecaca' : '1px solid #e2e8f0'
                        }}>
                          {isFirst ? 'Origin' : isLast ? 'Terminal' : 'Stop'}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>
                        <button 
                          onClick={() => setSelectedStopFilter(selectedStopFilter === stop ? 'ALL' : stop)}
                          style={{
                            background: boardedCount > 0 ? '#dcfce7' : '#f8fafc',
                            color: boardedCount > 0 ? '#15803d' : (expectedCount > 0 ? '#1e293b' : '#94a3b8'),
                            border: boardedCount > 0 ? '1px solid #86efac' : '1px solid #e2e8f0',
                            borderRadius: '4px',
                            padding: '0.2rem 0.6rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                          title={`Click to filter manifest for ${stop}`}
                        >
                          {boardedCount} / {expectedCount} Boarded
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ── Route Passenger Manifest Table ── */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Users size={15} style={{ color: '#2563eb' }} /> Enrolled Passenger Manifest
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {selectedStopFilter !== 'ALL' && (
              <span style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                Stop: {selectedStopFilter}
                <button onClick={() => setSelectedStopFilter('ALL')} style={{ background: 'none', border: 'none', color: '#1d4ed8', cursor: 'pointer', fontWeight: 800, padding: 0 }}>✕</button>
              </span>
            )}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.55rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                type="text"
                placeholder="Search student / roll..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                style={{ padding: '0.4rem 0.6rem 0.4rem 1.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem', outline: 'none', background: '#ffffff', color: '#0f172a' }}
              />
            </div>
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
            <Users size={28} style={{ color: '#cbd5e1', margin: '0 auto 0.4rem' }} />
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#334155' }}>No Enrolled Students Found</div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
              {studentSearch || selectedStopFilter !== 'ALL' ? 'No passengers match current filter.' : 'No students assigned to this route yet.'}
            </div>
          </div>
        ) : (
          <div className="driver-table-wrapper" style={{ overflowX: 'auto' }}>
            <table className="driver-table" style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '0.65rem 1rem' }}>Student Name</th>
                  <th style={{ padding: '0.65rem 1rem' }}>Roll / Student ID</th>
                  <th style={{ padding: '0.65rem 1rem' }}>Assigned Pickup Stop</th>
                  <th style={{ padding: '0.65rem 1rem' }}>Parent Emergency Phone</th>
                  <th style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>Transit Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student, idx) => {
                  const phone = student.studentProfile?.user?.phone || 'N/A';
                  return (
                    <tr key={student._id ? `${student._id}-${idx}` : `${student.studentId || 'st'}-${idx}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.65rem 1rem', fontWeight: 700, color: '#0f172a' }}>
                        {student.name}
                      </td>
                      <td style={{ padding: '0.65rem 1rem', color: '#64748b', fontFamily: 'monospace' }}>
                        {student.studentId}
                      </td>
                      <td style={{ padding: '0.65rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#334155', fontWeight: 600 }}>
                          <MapPin size={13} style={{ color: '#2563eb' }} />
                          {student.pickupPoint || 'Campus Gate'}
                        </div>
                      </td>
                      <td style={{ padding: '0.65rem 1rem' }}>
                        {phone !== 'N/A' ? (
                          <a href={`tel:${phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#166534', fontWeight: 700, fontSize: '0.78rem', textDecoration: 'none', background: '#dcfce7', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                            <Phone size={11} /> {phone}
                          </a>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Not Provided</span>
                        )}
                      </td>
                      <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>
                        <span style={{ padding: '0.15rem 0.55rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                          Registered
                        </span>
                      </td>
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

export default DriverRoute;
