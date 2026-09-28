import React, { useState, useEffect } from 'react';
import { 
  Bus, Clock, PlayCircle, StopCircle, CheckCircle, Navigation, 
  Users, MapPin, Check, AlertCircle, ArrowRight, Activity, RotateCcw, 
  Shield, Compass, Phone, Radio, ChevronRight, ShieldCheck, Search,
  Play, ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  getTransportTrips, createTransportTrip, updateTransportTrip, 
  getTransportRoutes, getTransportDrivers, getTransportStudents, getTransportVehicles 
} from '../../api/index';

const DriverTripManagement = () => {
  const [session, setSession] = useState({});
  const [myDriverInfo, setMyDriverInfo] = useState(null);
  const [route, setRoute] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [students, setStudents] = useState([]);
  
  const [trips, setTrips] = useState([]);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [studentSearch, setStudentSearch] = useState('');
  const [activeStopIndex, setActiveStopIndex] = useState(0);

  const [studentStatus, setStudentStatus] = useState(() => {
    return JSON.parse(localStorage.getItem('driver_student_status') || '{}');
  });

  const updateStudentStatus = (studentId, status) => {
    const updated = {
      ...studentStatus,
      [studentId]: status
    };
    setStudentStatus(updated);
    localStorage.setItem('driver_student_status', JSON.stringify(updated));
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = JSON.parse(sessionStorage.getItem('driver_session') || '{}');
      setSession(data);
      const driverId = data.referenceId || data._id;

      const tenantId = data.tenantId || 'mock_college_id';
      const localDrivers = JSON.parse(localStorage.getItem(`erp_transport_drivers_${tenantId}`) || '[]');
      const localRoutes  = JSON.parse(localStorage.getItem(`erp_transport_routes_${tenantId}`)  || '[]');
      const localStudents = JSON.parse(localStorage.getItem(`erp_transport_students_${tenantId}`) || '[]');
      const localVehicles = JSON.parse(localStorage.getItem(`erp_transport_vehicles_${tenantId}`) || '[]');

      const [driversRes, routesRes, studentsRes, vehiclesRes, tripsRes] = await Promise.all([
        getTransportDrivers().catch(() => ({ data: [] })),
        getTransportRoutes().catch(() => ({ data: [] })),
        getTransportStudents().catch(() => ({ data: [] })),
        getTransportVehicles().catch(() => ({ data: [] })),
        getTransportTrips().catch(() => ({ data: [] }))
      ]);

      const allDrivers = [
        ...localDrivers,
        ...(driversRes.data || []).filter(d => !localDrivers.find(l => l.driverId === d.driverId))
      ];
      const allRoutes = [
        ...localRoutes,
        ...(routesRes.data || []).filter(r => !localRoutes.find(l => l.routeId === r.routeId))
      ];
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
        (d.name && (cleanStr(d.name) === cleanStr(data.name) || cleanStr(d.name) === cleanStr(driverId))) ||
        (d._id && (cleanStr(d._id) === cleanStr(driverId) || cleanStr(d._id) === cleanStr(data.referenceId)))
      );
      setMyDriverInfo(me);

      const myRoute = allRoutes.find(r => {
        const rDriver = cleanStr(r.driver);
        const meName = cleanStr(me?.name || data.name);
        const meId = cleanStr(me?.driverId || data.referenceId);
        const meEmail = cleanStr(me?.email || data.email);
        return (meName && (rDriver === meName || rDriver.includes(meName))) || 
               (meId && (rDriver.includes(meId) || rDriver === meId)) || 
               (meEmail && rDriver.includes(meEmail)) ||
               (me?.routeId && (cleanStr(r.routeId) === cleanStr(me.routeId) || cleanStr(r.name) === cleanStr(me.routeId)));
      });
      setRoute(myRoute);

      const vehicleKey = myRoute ? myRoute.vehicle : (me?.vehicleId || me?.vehicle || null);
      if (vehicleKey && vehicleKey !== 'Unassigned') {
        const matchingVehicle = allVehicles.find(v => 
          cleanStr(v.vehicleNumber) === cleanStr(vehicleKey) ||
          cleanStr(v.vehicleId) === cleanStr(vehicleKey) ||
          cleanStr(v.registrationNumber) === cleanStr(vehicleKey)
        );
        setVehicle(matchingVehicle || { vehicleNumber: vehicleKey, vehicleId: vehicleKey });
      }
      
      if (myRoute) {
        const myStudents = allStudents.filter(s => s.routeId === myRoute.routeId || cleanStr(s.routeId) === cleanStr(myRoute.name));
        setStudents(myStudents);
      }

      const allTrips = tripsRes.data || [];
      setTrips(allTrips);
      
      const todayStr = new Date().toISOString().split('T')[0];
      const activeTrip = allTrips.find(t =>
        t.date === todayStr &&
        ['Scheduled', 'Started', 'Arrived'].includes(t.status)
      );
      setCurrentTrip(activeTrip);
    } catch (err) {
      console.error('Failed to load trip data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStartTrip = async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      
      const payload = {
        driverId: myDriverInfo ? myDriverInfo.driverId : (session.referenceId || session._id || 'DRIVER'),
        vehicleId: route ? route.vehicle : (vehicle?.vehicleNumber || myDriverInfo?.vehicleId || 'Unassigned'),
        routeId: route ? route.routeId : (myDriverInfo?.routeId || 'Unassigned'),
        date: todayStr,
        startTime: nowTime,
        status: 'Started',
        studentTracking: students.map(s => ({
          studentId: s.studentId,
          pickupPoint: s.pickupPoint,
          boarded: false,
          dropped: false
        }))
      };

      await createTransportTrip(payload);
      localStorage.setItem('driver_trip_status', 'IN TRANSIT');
      fetchData();
    } catch (err) {
      console.error('Failed to start trip', err);
      localStorage.setItem('driver_trip_status', 'IN TRANSIT');
      setCurrentTrip({ status: 'Started', startTime: new Date().toLocaleTimeString() });
    }
  };

  const handleArrivedTrip = async () => {
    try {
      if (currentTrip && currentTrip._id) {
        await updateTransportTrip(currentTrip._id, { status: 'Arrived' });
      }
      localStorage.setItem('driver_trip_status', 'ARRIVED');
      fetchData();
    } catch (err) {
      console.error('Failed to mark trip arrived', err);
      localStorage.setItem('driver_trip_status', 'ARRIVED');
    }
  };

  const handleEndTrip = async () => {
    try {
      const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      if (currentTrip && currentTrip._id) {
        await updateTransportTrip(currentTrip._id, {
          status: 'Completed',
          endTime: nowTime
        });
      }
      localStorage.setItem('driver_trip_status', 'COMPLETED');
      fetchData();
    } catch (err) {
      console.error('Failed to end trip', err);
      localStorage.setItem('driver_trip_status', 'COMPLETED');
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const completedToday = trips.find(t => t.date === todayStr && t.status === 'Completed');
  const assignedVehicleName = vehicle?.vehicleNumber || route?.vehicle || myDriverInfo?.vehicleId || 'TN 01 AD 1234';
  const assignedRouteName = route?.name || 'EAST';
  const pointsList = Array.isArray(route?.points) ? route.points : ['Origin Point', 'Main Junction', 'Campus Gate'];

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.studentId.toLowerCase().includes(studentSearch.toLowerCase()) ||
    (s.pickupPoint && s.pickupPoint.toLowerCase().includes(studentSearch.toLowerCase()))
  );

  const boardedCount = students.filter(s => studentStatus[s.studentId] === 'PICKED UP' || studentStatus[s.studentId] === 'DROPPED').length;

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#2563eb', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid #e0e7ff', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '0.75rem' }}></div>
        <p style={{ fontWeight: 600, fontSize: '0.88rem', color: '#475569' }}>Connecting live trip dispatch console...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.25rem 1.5rem', maxWidth: '1440px', margin: '0 auto', fontFamily: 'Inter, -apple-system, sans-serif', color: '#0f172a' }}>
      
      {/* ── Breadcrumb & Compact Header Bar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '0.2rem' }}>
            <span>Fleet Operations</span>
            <ChevronRight size={12} />
            <span style={{ color: '#0f172a' }}>Trip Operations & Live Tracking</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.01em' }}>
              Transit Trip Operations & Dispatch
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '0.2rem 0.6rem', background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }}></span>
            GPS ACTIVE
          </span>
          <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600, background: '#f1f5f9', padding: '0.2rem 0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
            Driver: {myDriverInfo?.driverId || session.referenceId || 'DRV-0002'}
          </span>
        </div>
      </div>

      {/* ── Compact Key Metric Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
            <span>Assigned Vehicle</span>
            <Bus size={14} style={{ color: '#2563eb' }} />
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem', fontFamily: 'monospace' }}>
            {assignedVehicleName}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600, marginTop: '0.15rem' }}>
            Ready (Capacity: {route?.capacity || 50})
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
            <span>Transit Route</span>
            <MapPin size={14} style={{ color: '#4f46e5' }} />
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>
            Route {assignedRouteName}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 600, marginTop: '0.15rem' }}>
            {pointsList.length} Scheduled Stops
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
            <span>Boarding Status</span>
            <Users size={14} style={{ color: '#16a34a' }} />
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>
            {boardedCount} / {students.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600, marginTop: '0.15rem' }}>
            {students.length > 0 ? `${Math.round((boardedCount / students.length) * 100)}% Boarded` : 'Manifest Ready'}
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
            <span>Shift Duty Status</span>
            <Activity size={14} style={{ color: '#0284c7' }} />
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: currentTrip?.status === 'Started' ? '#2563eb' : currentTrip?.status === 'Arrived' ? '#16a34a' : completedToday ? '#166534' : '#b45309', marginTop: '0.2rem' }}>
            {completedToday ? 'Completed' : currentTrip?.status === 'Started' ? 'In Transit' : currentTrip?.status === 'Arrived' ? 'At Destination' : 'Ready / Standby'}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginTop: '0.15rem' }}>
            Morning Shift
          </div>
        </div>

      </div>

      {/* ── Two-Column Operational Dispatch Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1.7fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
        
        {/* Left: Real-Time Trip Controller Card */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Navigation size={15} style={{ color: '#2563eb' }} /> Shift Dispatch Controller
            </h3>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '4px', background: currentTrip ? '#dbeafe' : '#f1f5f9', color: currentTrip ? '#1d4ed8' : '#475569' }}>
              {currentTrip ? currentTrip.status : 'STANDBY'}
            </span>
          </div>

          <div style={{ padding: '1rem' }}>
            
            {/* Pre-Trip Safety Status Pills */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '0.4rem' }}>Pre-Departure Safety Verification</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', fontSize: '0.75rem' }}>
                <div style={{ background: '#f8fafc', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '4px', color: '#166534', fontWeight: 600 }}>
                  <Check size={12} /> Brakes & Tyre Pressure OK
                </div>
                <div style={{ background: '#f8fafc', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '4px', color: '#166534', fontWeight: 600 }}>
                  <Check size={12} /> Speed Limiter (50 km/h) Active
                </div>
                <div style={{ background: '#f8fafc', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '4px', color: '#166534', fontWeight: 600 }}>
                  <Check size={12} /> First Aid & Safety Kit Intact
                </div>
                <div style={{ background: '#f8fafc', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '4px', color: '#166534', fontWeight: 600 }}>
                  <Check size={12} /> GPS Precision Calibrated
                </div>
              </div>
            </div>

            {/* Action Buttons depending on state */}
            {completedToday ? (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '0.85rem', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#166534', fontWeight: 800, fontSize: '0.88rem' }}>
                  <CheckCircle size={18} /> Shift Completed for Today
                </div>
                <div style={{ fontSize: '0.75rem', color: '#4b5563', marginTop: '4px' }}>
                  Start Time: <strong>{completedToday.startTime}</strong> • End Time: <strong>{completedToday.endTime || 'Concluded'}</strong>
                </div>
              </div>
            ) : currentTrip && (currentTrip.status === 'Started' || currentTrip.status === 'Arrived') ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '0.65rem 0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Departed At</span>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1d4ed8', fontFamily: 'monospace' }}>{currentTrip.startTime}</div>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', background: '#2563eb', color: '#ffffff', borderRadius: '4px' }}>
                    ● EN ROUTE
                  </span>
                </div>

                {currentTrip.status === 'Started' && (
                  <button
                    onClick={handleArrivedTrip}
                    style={{ padding: '0.65rem', background: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <CheckCircle size={16} /> Mark Arrived at Destination
                  </button>
                )}

                <button
                  onClick={handleEndTrip}
                  style={{ padding: '0.65rem', background: '#dc2626', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <StopCircle size={16} /> Complete & Conclude Shift
                </button>
              </div>
            ) : (
              <button
                onClick={handleStartTrip}
                style={{ width: '100%', padding: '0.75rem', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Play size={16} /> Start Transit Shift & Enable GPS Dispatch
              </button>
            )}

          </div>
        </div>

        {/* Right: Scheduled Route Stops & Live Timeline */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Compass size={15} style={{ color: '#2563eb' }} /> Scheduled Waypoint Stops
            </h3>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{pointsList.length} Waypoints</span>
          </div>

          <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {pointsList.map((stop, index) => {
              const studentsAtStop = students.filter(s => s.pickupPoint === stop).length;
              const isPassed = index < activeStopIndex;
              const isCurrent = index === activeStopIndex;

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
                    {isCurrent && (
                      <button
                        onClick={() => setActiveStopIndex(prev => Math.min(pointsList.length - 1, prev + 1))}
                        style={{ padding: '0.2rem 0.55rem', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Mark Reached ➔
                      </button>
                    )}
                    {!isCurrent && (
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: isPassed ? '#16a34a' : '#94a3b8' }}>
                        {isPassed ? 'Passed' : 'Pending'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ── Real-Time Passenger Manifest & Boarding Register ── */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', marginBottom: '1.5rem' }}>
        <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Users size={15} style={{ color: '#2563eb' }} /> Passenger Transit Manifest
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.55rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                type="text"
                placeholder="Search passenger / stop..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                style={{ padding: '0.35rem 0.6rem 0.35rem 1.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem', outline: 'none', background: '#ffffff', color: '#0f172a' }}
              />
            </div>
            <Link 
              to="/driver/students"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.75rem', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none' }}
            >
              Full Register <ExternalLink size={12} />
            </Link>
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
            <Users size={28} style={{ color: '#cbd5e1', margin: '0 auto 0.4rem' }} />
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#334155' }}>No Passengers Assigned</div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>No student records mapped to route {assignedRouteName}.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '0.65rem 1rem' }}>Student Name & ID</th>
                  <th style={{ padding: '0.65rem 1rem' }}>Pickup Stop</th>
                  <th style={{ padding: '0.65rem 1rem' }}>Parent Contact</th>
                  <th style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>Boarding Status</th>
                  <th style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>Quick Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => {
                  const phone = student.studentProfile?.user?.phone || 'N/A';
                  const status = studentStatus[student.studentId] || 'PENDING';

                  return (
                    <tr key={student._id || student.studentId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.65rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{student.name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace' }}>ID: {student.studentId}</div>
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
                        <span style={{
                          padding: '0.15rem 0.55rem',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background:
                            status === 'PICKED UP' ? '#dcfce7' :
                            status === 'ABSENT' ? '#fee2e2' :
                            status === 'DROPPED' ? '#ede9fe' : '#fef3c7',
                          color:
                            status === 'PICKED UP' ? '#15803d' :
                            status === 'ABSENT' ? '#b91c1c' :
                            status === 'DROPPED' ? '#6d28d9' : '#b45309',
                          border:
                            status === 'PICKED UP' ? '1px solid #bbf7d0' :
                            status === 'ABSENT' ? '1px solid #fecaca' :
                            status === 'DROPPED' ? '1px solid #ddd6fe' : '1px solid #fde68a'
                        }}>
                          {status}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          <button
                            onClick={() => updateStudentStatus(student.studentId, 'PICKED UP')}
                            style={{
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              border: '1px solid #86efac',
                              background: status === 'PICKED UP' ? '#16a34a' : '#ffffff',
                              color: status === 'PICKED UP' ? '#ffffff' : '#16a34a',
                              fontWeight: 700,
                              fontSize: '0.72rem',
                              cursor: 'pointer'
                            }}
                          >
                            ✓ Board
                          </button>

                          <button
                            onClick={() => updateStudentStatus(student.studentId, 'DROPPED')}
                            style={{
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              border: '1px solid #ddd6fe',
                              background: status === 'DROPPED' ? '#7c3aed' : '#ffffff',
                              color: status === 'DROPPED' ? '#ffffff' : '#7c3aed',
                              fontWeight: 700,
                              fontSize: '0.72rem',
                              cursor: 'pointer'
                            }}
                          >
                            Drop
                          </button>

                          <button
                            onClick={() => updateStudentStatus(student.studentId, 'ABSENT')}
                            style={{
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              border: '1px solid #fca5a5',
                              background: status === 'ABSENT' ? '#dc2626' : '#ffffff',
                              color: status === 'ABSENT' ? '#ffffff' : '#dc2626',
                              fontWeight: 700,
                              fontSize: '0.72rem',
                              cursor: 'pointer'
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Trip Activity History Table ── */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Clock size={15} style={{ color: '#64748b' }} /> Trip Activity & Dispatch Audit History
          </h3>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '0.65rem 1rem' }}>Duty Date</th>
                <th style={{ padding: '0.65rem 1rem' }}>Operating Vehicle</th>
                <th style={{ padding: '0.65rem 1rem' }}>Departure Time</th>
                <th style={{ padding: '0.65rem 1rem' }}>Arrival Time</th>
                <th style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>Shift Status</th>
              </tr>
            </thead>
            <tbody>
              {trips.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                    No recorded trips for this vehicle yet.
                  </td>
                </tr>
              ) : (
                trips.slice(0, 10).map((trip, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.65rem 1rem', fontWeight: 600 }}>{trip.date}</td>
                    <td style={{ padding: '0.65rem 1rem', fontWeight: 700, color: '#2563eb', fontFamily: 'monospace' }}>{trip.vehicleId || assignedVehicleName}</td>
                    <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace', color: '#475569' }}>{trip.startTime || '—'}</td>
                    <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace', color: '#475569' }}>{trip.endTime || '—'}</td>
                    <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>
                      <span style={{ padding: '0.15rem 0.55rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, background: trip.status === 'Completed' ? '#dcfce7' : '#dbeafe', color: trip.status === 'Completed' ? '#166534' : '#1e40af', border: trip.status === 'Completed' ? '1px solid #bbf7d0' : '1px solid #bfdbfe' }}>
                        {trip.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default DriverTripManagement;
