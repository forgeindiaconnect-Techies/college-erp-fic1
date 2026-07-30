import React, { useState, useEffect } from 'react';
import { Bus, Settings, Calendar, ShieldCheck, AlertCircle, Info, Wrench, CheckCircle, X, Clock, ArrowRight, ShieldAlert, Activity, ClipboardList, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createTransportComplaint, getTransportComplaints, getTransportDrivers } from '../../api/index';

const DriverVehicle = () => {
  const [session, setSession] = useState({});
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [myIssues, setMyIssues] = useState([]);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueForm, setIssueForm] = useState({
    issueType: 'Vehicle Issue',
    description: ''
  });

  const issueTypes = [
    'Driver Issue',
    'Vehicle Issue',
    'Route Issue',
    'Student Issue',
    'General Issue'
  ];

  useEffect(() => {
    const loadVehicle = async () => {
      try {
        const data = JSON.parse(sessionStorage.getItem('driver_session') || '{}');
        setSession(data);
        
        const driverId = data.referenceId || data._id;
        const tenantId = data.tenantId || 'mock_college_id';
        if (!driverId) { setLoading(false); return; }

        const localDrivers = JSON.parse(localStorage.getItem(`erp_transport_drivers_${tenantId}`) || '[]');
        const localRoutes  = JSON.parse(localStorage.getItem(`erp_transport_routes_${tenantId}`)  || '[]');

        const [driversRes, routesRes] = await Promise.all([
          getTransportDrivers().catch(() => ({ data: [] })),
          getTransportRoutes().catch(() => ({ data: [] }))
        ]);

        const allDrivers = [
          ...localDrivers,
          ...(driversRes.data || []).filter(d => !localDrivers.find(l => l.driverId === d.driverId))
        ];
        const allRoutes = [
          ...localRoutes,
          ...(routesRes.data || []).filter(r => !localRoutes.find(l => l.routeId === r.routeId))
        ];

        const cleanStr = (str) => (str || '').toString().trim().toLowerCase();
        const me = allDrivers.find(d => 
          cleanStr(d.driverId) === cleanStr(driverId) || 
          cleanStr(d.phone).replace(/\s+/g, '') === cleanStr(driverId).replace(/\s+/g, '') || 
          cleanStr(d.name) === cleanStr(driverId)
        );

        if (me) {
          const myRoute = allRoutes.find(r => {
            const rDriver = cleanStr(r.driver);
            const meName = cleanStr(me.name);
            const meId = cleanStr(me.driverId);
            return rDriver === meName || 
                   rDriver === `${meName}(${meId})` || 
                   rDriver === `${meName} (${meId})` ||
                   rDriver.includes(meName) || 
                   rDriver.includes(meId) ||
                   (me.routeId && (cleanStr(r.routeId) === cleanStr(me.routeId) || cleanStr(r.name) === cleanStr(me.routeId)));
          });
          const vehicleNumber = myRoute ? myRoute.vehicle : (me.vehicleId || me.vehicle || 'Unassigned');

          setVehicle({
            vehicleId: vehicleNumber,
            vehicleNumber: vehicleNumber, 
            vehicleType: 'School Bus',
            capacity: myRoute ? (myRoute.capacity || 50) : 50,
            registrationNumber: vehicleNumber,
            assignedRoute: myRoute ? myRoute.name : 'Unassigned',
            insuranceExpiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
            status: 'Active',
            maintenanceStatus: 'Good'
          });

          try {
            const compRes = await getTransportComplaints();
            const driverIssues = compRes.data.filter(c => c.studentId === driverId);
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
        busNumber: vehicle.vehicleId,
        routeId: vehicle.assignedRoute || 'Unassigned',
        complaintType: issueForm.issueType,
        description: issueForm.description,
        status: 'Pending'
      });
      alert('Issue reported successfully! The Transport Admin has been notified.');
      setShowIssueModal(false);
      setIssueForm({ issueType: 'Vehicle Issue', description: '' });
      const compRes = await getTransportComplaints();
      const driverIssues = compRes.data.filter(c => c.studentId === (session.referenceId || session._id));
      setMyIssues(driverIssues);
    } catch (err) {
      console.error('Failed to report issue', err);
      alert('Failed to report issue. Please try again.');
    }
  };

  const getStatusStyle = (status) => {
    switch(status) {
      case 'Resolved': return { bg: '#dcfce7', text: '#166534', dot: '#22c55e' };
      case 'In Progress': return { bg: '#fef9c3', text: '#854d0e', dot: '#eab308' };
      default: return { bg: '#fee2e2', text: '#dc2626', dot: '#ef4444' };
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#6b7280' }}>
      <div style={{ width: '3rem', height: '3rem', border: '4px solid #bfdbfe', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '1rem' }}></div>
      <p style={{ fontWeight: 'bold' }}>Loading vehicle details...</p>
    </div>
  );

  if (!vehicle) {
    return (
      <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Bus style={{ color: '#2563eb' }} /> My Vehicle
        </h1>
        <div style={{ backgroundColor: '#fefce8', border: '1px solid #fef08a', color: '#854d0e', padding: '1.5rem', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Info size={24} />
          <p style={{ fontWeight: 500 }}>You have not been assigned a vehicle yet. Please contact the Transport Admin.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Bus style={{ color: '#2563eb' }} /> Fleet Access
          </h1>
          <p style={{ color: '#6b7280', margin: 0 }}>View comprehensive information and report issues for your assigned vehicle.</p>
        </div>
        <button 
          onClick={() => setShowIssueModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', backgroundColor: '#FCEBEB', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '0.75rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
        >
          <ShieldAlert size={18} /> Report Issue
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        
        {/* Main Details */}
        <div style={{ gridColumn: '1 / -1' }} className="lg:col-span-2">
          <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
            
            {/* Gradient Banner */}
            <div style={{ background: 'var(--primary)', padding: '1.25rem 1.5rem', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <p style={{ color: '#bfdbfe', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.25rem 0' }}>{vehicle.vehicleType} • Capacity: {vehicle.capacity}</p>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, letterSpacing: '0.05em', color: 'white' }}>{vehicle.vehicleNumber}</h2>
              </div>
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', padding: '0.25rem 1rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 'bold', backdropFilter: 'blur(4px)' }}>
                ID: {vehicle.vehicleId}
              </div>
            </div>
            
            <div style={{ padding: '2rem', display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
              <div style={{ flex: '1 1 200px' }}>
                <p style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Registration Number</p>
                <p style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>{vehicle.registrationNumber}</p>
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <p style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Assigned Route</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={16} style={{ color: '#2563eb' }} />
                  <p style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>{vehicle.assignedRoute || 'Unassigned'}</p>
                </div>
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <p style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Insurance Expiry Date</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={16} style={{ color: '#10b981' }} />
                  <p style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>{new Date(vehicle.insuranceExpiryDate).toLocaleDateString()}</p>
                </div>
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <p style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Status</p>
                <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0.25rem 0.75rem', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  {vehicle.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Maintenance Card */}
        <div style={{ gridColumn: 'span 1' }}>
          <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '1rem', padding: '1.5rem', height: '100%' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1.5rem 0' }}>
              <Activity size={20} style={{ color: '#2563eb' }} /> Health Status
            </h3>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: vehicle.maintenanceStatus === 'Good' ? '#dcfce7' : '#fef9c3', color: vehicle.maintenanceStatus === 'Good' ? '#166534' : '#854d0e', flexShrink: 0 }}>
                {vehicle.maintenanceStatus === 'Good' ? <CheckCircle size={24} /> : <Settings size={24} style={{ animation: 'spin 3s linear infinite' }} />}
              </div>
              <div>
                <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827', margin: '0 0 0.25rem 0' }}>{vehicle.maintenanceStatus}</p>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>Overall Condition</p>
              </div>
            </div>
            
            <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '1.5rem' }}>
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Upcoming Schedule</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #f1f5f9' }}>
                <Calendar size={18} style={{ color: '#2563eb' }} />
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#1e293b', margin: '0 0 0.125rem 0' }}>General Service</p>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>In 15 Days (Estimated)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* My Reported Issues */}
      <div style={{ marginTop: '3rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <ClipboardList size={20} style={{ color: '#4b5563' }} /> Issue Tracking History
        </h2>
        
        {myIssues.length === 0 ? (
          <div style={{ backgroundColor: 'white', border: '1px dashed #d1d5db', borderRadius: '1rem', padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
            <AlertCircle size={32} style={{ color: '#9ca3af', margin: '0 auto 1rem auto' }} />
            <p style={{ fontWeight: 500, fontSize: '1rem', margin: '0 0 0.5rem 0' }}>No issues reported</p>
            <p style={{ fontSize: '0.875rem', margin: 0 }}>All systems are currently running smoothly.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
            {myIssues.map(issue => {
              const sStyle = getStatusStyle(issue.status);
              return (
                <div key={issue._id} style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: '#f3f4f6', color: '#374151', padding: '0.25rem 0.5rem', borderRadius: '0.375rem' }}>
                      {issue.complaintType}
                    </span>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 'bold', backgroundColor: sStyle.bg, color: sStyle.text, padding: '0.25rem 0.625rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <div style={{ width: '0.375rem', height: '0.375rem', borderRadius: '50%', backgroundColor: sStyle.dot }}></div>
                      {issue.status}
                    </span>
                  </div>
                  
                  <p style={{ fontSize: '0.875rem', color: '#4b5563', margin: '0 0 1.25rem 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1, lineHeight: '1.5' }}>
                    {issue.description}
                  </p>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f3f4f6', paddingTop: '1rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 500 }}>
                      <Clock size={12} style={{ display: 'inline', marginRight: '0.25rem', verticalAlign: 'text-bottom' }} />
                      {new Date(issue.createdAt).toLocaleDateString()}
                    </span>
                    <Link to={`/driver/vehicle/complaints/${issue._id}`} style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#2563eb', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      View Details <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Report Issue Modal */}
      {showIssueModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }} onClick={() => setShowIssueModal(false)}>
          <div style={{ backgroundColor: 'white', borderRadius: '1rem', width: '100%', maxWidth: '28rem', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldAlert size={20} style={{ color: '#dc2626' }} /> Report Vehicle Issue
              </h2>
              <button onClick={() => setShowIssueModal(false)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '0.25rem' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleReportIssue}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: '#374151', marginBottom: '0.5rem' }}>Issue Category</label>
                <select 
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', backgroundColor: '#f9fafb', fontSize: '0.875rem', outline: 'none', color: '#111827' }}
                  value={issueForm.issueType}
                  onChange={e => setIssueForm({...issueForm, issueType: e.target.value})}
                  required
                >
                  {issueTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: '#374151', marginBottom: '0.5rem' }}>Description</label>
                <textarea 
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', backgroundColor: '#f9fafb', fontSize: '0.875rem', outline: 'none', minHeight: '8rem', resize: 'none', color: '#111827', fontFamily: 'inherit' }}
                  placeholder="Please describe the problem in detail..."
                  value={issueForm.description}
                  onChange={e => setIssueForm({...issueForm, description: e.target.value})}
                  required
                ></textarea>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowIssueModal(false)} style={{ flex: 1, padding: '0.75rem', backgroundColor: '#f3f4f6', color: '#4b5563', borderRadius: '0.5rem', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ flex: 1, padding: '0.75rem', backgroundColor: '#dc2626', color: 'white', borderRadius: '0.5rem', fontWeight: 'bold', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  Submit Report <ArrowRight size={16} />
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
