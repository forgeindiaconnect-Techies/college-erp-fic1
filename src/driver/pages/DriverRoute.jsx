import React, { useState, useEffect } from 'react';
import { 
  MapPin, Navigation, Clock, Users, ArrowRight, AlertTriangle, 
  Route as RouteIcon, Target, Activity, ChevronRight, Bus, 
  Phone, UserCheck, Search, ShieldCheck, Download, ExternalLink, Compass
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getTransportRoutes, getTransportStudents, getTransportDrivers, getTransportVehicles } from '../../api/index';

const DriverRoute = () => {
  const [session, setSession] = useState({});
  const [driverInfo, setDriverInfo] = useState(null);
  const [route, setRoute] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStopFilter, setSelectedStopFilter] = useState('ALL');

  useEffect(() => {
    const fetchRouteData = async () => {
      try {
        const data = JSON.parse(sessionStorage.getItem('driver_session') || '{}');
        setSession(data);
        
        const driverId = data.referenceId || data._id;
        const tenantId = data.tenantId || 'mock_college_id';

        const localDrivers = JSON.parse(localStorage.getItem(`erp_transport_drivers_${tenantId}`) || '[]');
        const localRoutes  = JSON.parse(localStorage.getItem(`erp_transport_routes_${tenantId}`)  || '[]');
        const localStudents = JSON.parse(localStorage.getItem(`erp_transport_students_${tenantId}`) || '[]');
        const localVehicles = JSON.parse(localStorage.getItem(`erp_transport_vehicles_${tenantId}`) || '[]');

        const [driversRes, routesRes, studentsRes, vehiclesRes] = await Promise.all([
          getTransportDrivers().catch(() => ({ data: [] })),
          getTransportRoutes().catch(() => ({ data: [] })),
          getTransportStudents().catch(() => ({ data: [] })),
          getTransportVehicles().catch(() => ({ data: [] }))
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
        setDriverInfo(me);

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

        if (myRoute) {
          const myStudents = allStudents.filter(s => s.routeId === myRoute.routeId || cleanStr(s.routeId) === cleanStr(myRoute.name));
          setStudents(myStudents);

          const matchingVeh = allVehicles.find(v => 
            cleanStr(v.vehicleNumber) === cleanStr(myRoute.vehicle) || 
            cleanStr(v.vehicleId) === cleanStr(myRoute.vehicle)
          );
          setVehicle(matchingVeh);
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
    <div style={{ padding: '1.25rem 1.5rem', maxWidth: '1440px', margin: '0 auto', fontFamily: 'Inter, -apple-system, sans-serif', color: '#0f172a' }}>
      
      {/* ── ERP Breadcrumb & Compact Header Bar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '0.2rem' }}>
            <span>Fleet Operations</span>
            <ChevronRight size={12} />
            <span>Routes</span>
            <ChevronRight size={12} />
            <span style={{ color: '#0f172a' }}>Route {route.name} ({route.routeId})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.01em' }}>
              Route Master: {route.name}
            </h1>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '0.15rem 0.6rem', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
              ID: {route.routeId}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Link 
            to="/driver/trip"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.9rem', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.8rem', textDecoration: 'none', cursor: 'pointer' }}
          >
            <Compass size={14} /> Start Trip Operations
          </Link>
          <Link 
            to="/driver/students"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.9rem', backgroundColor: '#ffffff', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 700, fontSize: '0.8rem', textDecoration: 'none' }}
          >
            <Users size={14} /> Student Transit List
          </Link>
        </div>
      </div>

      {/* ── Compact Key Metric Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
            <span>Operating Bus</span>
            <Bus size={14} style={{ color: '#2563eb' }} />
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>
            {route.vehicle || 'TN 01 AD 1234'}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600, marginTop: '0.15rem' }}>
            Capacity: {route.capacity || 50} Seats
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
            <span>Stops & Waypoints</span>
            <MapPin size={14} style={{ color: '#4f46e5' }} />
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>
            {pointsList.length} Scheduled Stops
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginTop: '0.15rem' }}>
            Origin: {startStop}
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
            <span>Passenger Load</span>
            <Users size={14} style={{ color: '#16a34a' }} />
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>
            {students.length} / {route.capacity || 50}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600, marginTop: '0.15rem' }}>
            {Math.round((students.length / (route.capacity || 50)) * 100)}% Booked
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
            <span>Estimated Runtime</span>
            <Clock size={14} style={{ color: '#0284c7' }} />
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>
            ~45 Minutes
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginTop: '0.15rem' }}>
            Shift: Morning & Evening
          </div>
        </div>

      </div>

      {/* ── Route Specs & Waypoints Split ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
        
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

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
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
                  const count = getStudentCountForStop(stop);
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
                            background: count > 0 ? '#eff6ff' : '#f8fafc',
                            color: count > 0 ? '#1d4ed8' : '#94a3b8',
                            border: count > 0 ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                            borderRadius: '4px',
                            padding: '0.15rem 0.5rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {count} Students
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
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
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
                {filteredStudents.map((student) => {
                  const phone = student.studentProfile?.user?.phone || 'N/A';
                  return (
                    <tr key={student._id || student.studentId} style={{ borderBottom: '1px solid #f1f5f9' }}>
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
