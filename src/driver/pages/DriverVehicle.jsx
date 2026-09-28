import React, { useState, useEffect } from 'react';
import { 
  Bus, Settings, Calendar, ShieldCheck, AlertCircle, Info, Wrench, 
  CheckCircle, X, Clock, ArrowRight, ShieldAlert, Activity, ClipboardList, 
  MapPin, UserCheck, Shield, ChevronRight, FileText, Gauge, Fuel,
  Compass, Radio, AlertTriangle, Download, RefreshCw, Check
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  createTransportComplaint, getTransportComplaints, getTransportDrivers, 
  getTransportRoutes, getTransportVehicles 
} from '../../api/index';

const DriverVehicle = () => {
  const [session, setSession] = useState({});
  const [vehicle, setVehicle] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [driverInfo, setDriverInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [myIssues, setMyIssues] = useState([]);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [activeTab, setActiveTab] = useState('specs'); // 'specs' | 'maintenance' | 'issues' | 'telemetry'
  const [issueForm, setIssueForm] = useState({
    issueType: 'Vehicle Issue',
    priority: 'Medium',
    description: ''
  });

  const issueTypes = [
    'Vehicle Issue',
    'Brakes & Suspension',
    'Engine & Battery',
    'Tire & Wheel Alignment',
    'Air Conditioner / Electricals',
    'Route & GPS Tracker',
    'Driver & Transit Assistance',
    'General Issue'
  ];

  useEffect(() => {
    const loadVehicle = async () => {
      try {
        const data = JSON.parse(sessionStorage.getItem('driver_session') || '{}');
        setSession(data);
        
        const driverId = data.referenceId || data._id;
        const tenantId = data.tenantId || 'mock_college_id';

        const localDrivers = JSON.parse(localStorage.getItem(`erp_transport_drivers_${tenantId}`) || '[]');
        const localRoutes  = JSON.parse(localStorage.getItem(`erp_transport_routes_${tenantId}`)  || '[]');
        const localVehicles = JSON.parse(localStorage.getItem(`erp_transport_vehicles_${tenantId}`) || '[]');

        const [driversRes, routesRes, vehiclesRes] = await Promise.all([
          getTransportDrivers().catch(() => ({ data: [] })),
          getTransportRoutes().catch(() => ({ data: [] })),
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
        setRouteInfo(myRoute);

        const vehicleKey = myRoute ? myRoute.vehicle : (me?.vehicleId || me?.vehicle || 'TN 01 AD 1234');

        if (vehicleKey && vehicleKey !== 'Unassigned') {
          const matchingVehicle = allVehicles.find(v => 
            cleanStr(v.vehicleNumber) === cleanStr(vehicleKey) ||
            cleanStr(v.vehicleId) === cleanStr(vehicleKey) ||
            cleanStr(v.registrationNumber) === cleanStr(vehicleKey) ||
            cleanStr(v._id) === cleanStr(vehicleKey)
          );

          setVehicle({
            vehicleId: matchingVehicle?.vehicleId || vehicleKey,
            vehicleNumber: matchingVehicle?.vehicleNumber || vehicleKey, 
            vehicleType: matchingVehicle?.vehicleType || 'College Bus (Heavy Vehicle)',
            capacity: matchingVehicle?.capacity || (myRoute ? myRoute.capacity : 50),
            registrationNumber: matchingVehicle?.registrationNumber || vehicleKey,
            assignedRoute: myRoute ? myRoute.name : (matchingVehicle?.assignedRoute || 'EAST'),
            insuranceExpiryDate: matchingVehicle?.insuranceExpiryDate || '2027-09-28',
            fitnessCertExpiry: '2027-11-15',
            pucExpiry: '2027-04-10',
            status: matchingVehicle?.status || 'Active / In-Fleet',
            maintenanceStatus: matchingVehicle?.maintenanceStatus || 'Certified Safe',
            fuelType: 'Diesel (Euro VI)',
            chassisNo: 'MB1-45698712398',
            engineNo: 'ENG-D890453',
            speedGovernor: 'Calibrated (Max 50 km/h)',
            gpsTracker: 'Online / High Precision',
            odometer: '48,250 km'
          });

          try {
            const compRes = await getTransportComplaints();
            const driverIssues = (compRes.data || []).filter(c => 
              c.studentId === driverId || c.studentId === data._id || c.name === data.name || c.busNumber === vehicleKey
            );
            setMyIssues(driverIssues);
          } catch(e) {
            console.error("Failed to fetch my complaints");
          }
        }
      } catch (err) {
        console.error('Failed to load vehicle details', err);
      } finally {
        setLoading(false);
      }
    };
    loadVehicle();
  }, []);

  const handleReportIssue = async (e) => {
    e.preventDefault();
    try {
      await createTransportComplaint({
        name: session.name || 'Driver',
        studentId: session.referenceId || session._id,
        reporterType: 'Driver',
        busNumber: vehicle?.vehicleId || 'TN 01 AD 1234',
        routeId: vehicle?.assignedRoute || 'EAST',
        complaintType: `${issueForm.issueType} [${issueForm.priority}]`,
        description: issueForm.description,
        status: 'Pending'
      });
      alert('Maintenance issue logged successfully! Dispatched to Fleet Maintenance Team.');
      setShowIssueModal(false);
      setIssueForm({ issueType: 'Vehicle Issue', priority: 'Medium', description: '' });
      const compRes = await getTransportComplaints();
      const driverIssues = (compRes.data || []).filter(c => c.studentId === (session.referenceId || session._id));
      setMyIssues(driverIssues);
    } catch (err) {
      console.error('Failed to report issue', err);
      alert('Failed to report issue. Please try again.');
    }
  };

  const getStatusStyle = (status) => {
    switch(status) {
      case 'Resolved': return { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' };
      case 'In Progress': return { bg: '#fef3c7', text: '#b45309', border: '#fde68a' };
      default: return { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' };
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#2563eb', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid #e0e7ff', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '0.75rem' }}></div>
        <p style={{ fontWeight: 600, fontSize: '0.88rem', color: '#475569' }}>Loading vehicle master record...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.25rem 1.5rem', maxWidth: '1440px', margin: '0 auto', fontFamily: 'Inter, -apple-system, sans-serif', color: '#0f172a' }}>
      
      {/* ── ERP Breadcrumb & Compact Header Bar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '0.2rem' }}>
            <span>Fleet Management</span>
            <ChevronRight size={12} />
            <span>Vehicles</span>
            <ChevronRight size={12} />
            <span style={{ color: '#0f172a' }}>{vehicle?.registrationNumber || 'TN 01 AD 1234'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.01em' }}>
              Vehicle Master: {vehicle?.registrationNumber || 'TN 01 AD 1234'}
            </h1>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '0.15rem 0.6rem', background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#16a34a' }}></span>
              ACTIVE
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button 
            onClick={() => setShowIssueModal(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.9rem', backgroundColor: '#ffffff', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '6px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
          >
            <ShieldAlert size={14} /> Report Vehicle Defect
          </button>
          <Link 
            to="/driver/trip"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.9rem', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.8rem', textDecoration: 'none', cursor: 'pointer' }}
          >
            <Compass size={14} /> Trip Operations
          </Link>
        </div>
      </div>

      {/* ── Compact Real-Time Telemetry & Metric Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
            <span>Assigned Route</span>
            <MapPin size={14} style={{ color: '#2563eb' }} />
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>
            {vehicle?.assignedRoute || 'EAST'}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 600, marginTop: '0.15rem' }}>
            {routeInfo ? `${routeInfo.points?.length || 0} Scheduled Stops` : 'Shift Route 01'}
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
            <span>Seating Capacity</span>
            <Bus size={14} style={{ color: '#4f46e5' }} />
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>
            {vehicle?.capacity || 50} Seats
          </div>
          <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600, marginTop: '0.15rem' }}>
            Standard Passenger Layout
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
            <span>Health & Compliance</span>
            <ShieldCheck size={14} style={{ color: '#16a34a' }} />
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#16a34a', marginTop: '0.2rem' }}>
            Certified Safe
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginTop: '0.15rem' }}>
            Next Service: 15 Days
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
            <span>GPS Tracking Device</span>
            <Radio size={14} style={{ color: '#10b981' }} />
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>
            Connected
          </div>
          <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600, marginTop: '0.15rem' }}>
            Speed Governor: 50 km/h
          </div>
        </div>

      </div>

      {/* ── ERP Master Specification & Operation Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
        
        {/* Left Column: Comprehensive Vehicle Master Data Table */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <FileText size={15} style={{ color: '#2563eb' }} /> Vehicle Technical & Registration Specifications
            </h3>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace' }}>DOC-REF: VE-9842</span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.65rem 1rem', width: '35%', color: '#64748b', fontWeight: 600, background: '#fcfdfd' }}>Registration Number</td>
                <td style={{ padding: '0.65rem 1rem', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>{vehicle?.registrationNumber || 'TN 01 AD 1234'}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.65rem 1rem', color: '#64748b', fontWeight: 600, background: '#fcfdfd' }}>Vehicle Classification</td>
                <td style={{ padding: '0.65rem 1rem', fontWeight: 700, color: '#0f172a' }}>{vehicle?.vehicleType || 'College Transport Bus'}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.65rem 1rem', color: '#64748b', fontWeight: 600, background: '#fcfdfd' }}>Fuel & Propulsion</td>
                <td style={{ padding: '0.65rem 1rem', color: '#334155' }}>{vehicle?.fuelType || 'Diesel (BS-VI Clean Emission)'}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.65rem 1rem', color: '#64748b', fontWeight: 600, background: '#fcfdfd' }}>Chassis / VIN Code</td>
                <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace', color: '#334155' }}>{vehicle?.chassisNo || 'MB1-45698712398'}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.65rem 1rem', color: '#64748b', fontWeight: 600, background: '#fcfdfd' }}>Engine Serial Number</td>
                <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace', color: '#334155' }}>{vehicle?.engineNo || 'ENG-D890453'}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.65rem 1rem', color: '#64748b', fontWeight: 600, background: '#fcfdfd' }}>Insurance Validity</td>
                <td style={{ padding: '0.65rem 1rem', fontWeight: 700, color: '#16a34a' }}>
                  Valid up to {new Date(vehicle?.insuranceExpiryDate || '2027-09-28').toLocaleDateString()}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.65rem 1rem', color: '#64748b', fontWeight: 600, background: '#fcfdfd' }}>Fitness Certificate (FC)</td>
                <td style={{ padding: '0.65rem 1rem', color: '#334155' }}>Valid (Exp: {vehicle?.fitnessCertExpiry || '15-Nov-2027'})</td>
              </tr>
              <tr>
                <td style={{ padding: '0.65rem 1rem', color: '#64748b', fontWeight: 600, background: '#fcfdfd' }}>Speed Limiter & Safety Unit</td>
                <td style={{ padding: '0.65rem 1rem', color: '#334155' }}>{vehicle?.speedGovernor || 'Calibrated & Certified'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Right Column: Assigned Driver & Transit Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Assigned Driver Box */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <UserCheck size={15} style={{ color: '#2563eb' }} /> Active Driver Assignment
              </h3>
            </div>
            
            <div style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Designated Driver:</span>
                <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{session.name || 'RENU'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Driver ID:</span>
                <span style={{ fontSize: '0.85rem', fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>{driverInfo?.driverId || session.referenceId || 'DRV-001'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Assigned Shift:</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>Regular Morning & Evening</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Emergency Contact:</span>
                <span style={{ fontSize: '0.8rem', color: '#334155', fontFamily: 'monospace' }}>{session.phone || '+91 98765 43210'}</span>
              </div>
            </div>
          </div>

          {/* Quick Route Shortcut Box */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Assigned Transit Route</span>
              <Link to="/driver/route" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', textDecoration: 'none' }}>
                View Stops Map ➔
              </Link>
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem' }}>
              Route {vehicle?.assignedRoute || 'EAST'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <Link to="/driver/trip" style={{ padding: '0.5rem', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, textAlign: 'center', textDecoration: 'none' }}>
                Trip Controller
              </Link>
              <Link to="/driver/students" style={{ padding: '0.5rem', background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, textAlign: 'center', textDecoration: 'none' }}>
                Passenger List
              </Link>
            </div>
          </div>

        </div>

      </div>

      {/* ── Maintenance Grievance & Defect Log Table ── */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ClipboardList size={15} style={{ color: '#64748b' }} /> Vehicle Defect & Maintenance Log
            </h3>
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
            {myIssues.length} Registered Incidents
          </span>
        </div>

        {myIssues.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
            <CheckCircle size={28} style={{ color: '#16a34a', margin: '0 auto 0.4rem', opacity: 0.8 }} />
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#334155' }}>No Active Vehicle Defects Reported</div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>All mechanical, electrical, and structural systems meet standard compliance.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '0.65rem 1rem' }}>Category</th>
                  <th style={{ padding: '0.65rem 1rem' }}>Defect Description</th>
                  <th style={{ padding: '0.65rem 1rem' }}>Date Logged</th>
                  <th style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {myIssues.map(issue => {
                  const sStyle = getStatusStyle(issue.status);
                  return (
                    <tr key={issue._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.65rem 1rem', fontWeight: 700, color: '#0f172a' }}>
                        {issue.complaintType}
                      </td>
                      <td style={{ padding: '0.65rem 1rem', color: '#475569' }}>
                        {issue.description}
                      </td>
                      <td style={{ padding: '0.65rem 1rem', color: '#64748b', fontFamily: 'monospace' }}>
                        {new Date(issue.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>
                        <span style={{ padding: '0.15rem 0.55rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, background: sStyle.bg, color: sStyle.text, border: `1px solid ${sStyle.border}` }}>
                          {issue.status}
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

      {/* ── Report Issue Modal ── */}
      {showIssueModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '1rem' }} onClick={() => setShowIssueModal(false)}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', width: '100%', maxWidth: '28rem', padding: '1.25rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ShieldAlert size={18} style={{ color: '#dc2626' }} /> Log Vehicle Maintenance Defect
              </h2>
              <button onClick={() => setShowIssueModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.2rem' }}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleReportIssue}>
              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Defect Category</label>
                <select 
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', fontSize: '0.82rem', outline: 'none', color: '#0f172a' }}
                  value={issueForm.issueType}
                  onChange={e => setIssueForm({...issueForm, issueType: e.target.value})}
                  required
                >
                  {issueTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Urgency Level</label>
                <select 
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', fontSize: '0.82rem', outline: 'none', color: '#0f172a' }}
                  value={issueForm.priority}
                  onChange={e => setIssueForm({...issueForm, priority: e.target.value})}
                  required
                >
                  <option value="Low">Low (Routine Observation)</option>
                  <option value="Medium">Medium (Fix Before Next Shift)</option>
                  <option value="High">High (Immediate Attention Required)</option>
                  <option value="Critical">Critical (Vehicle Unsafe to Drive)</option>
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Defect Description & Remarks</label>
                <textarea 
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', fontSize: '0.82rem', outline: 'none', minHeight: '5.5rem', resize: 'none', color: '#0f172a', fontFamily: 'inherit' }}
                  placeholder="Provide exact details (e.g. brake vibration, air conditioning cooling drop, battery warning light)..."
                  value={issueForm.description}
                  onChange={e => setIssueForm({...issueForm, description: e.target.value})}
                  required
                ></textarea>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" onClick={() => setShowIssueModal(false)} style={{ flex: 1, padding: '0.55rem', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '6px', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.82rem' }}>
                  Cancel
                </button>
                <button type="submit" style={{ flex: 1, padding: '0.55rem', backgroundColor: '#dc2626', color: 'white', borderRadius: '6px', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.82rem' }}>
                  Submit Defect Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default DriverVehicle;
