import React, { useState, useEffect } from 'react';
import { CheckSquare, Wrench, ShieldCheck, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { getTransportMaintenance, updateTransportMaintenance, getTransportComplaints, updateTransportComplaint, getTransportRoutes } from '../../api/index';

const DriverTasks = () => {
  const [loading, setLoading] = useState(true);
  const [maintenanceTasks, setMaintenanceTasks] = useState([]);
  const [complaintTasks, setComplaintTasks] = useState([]);
  const [driverInfo, setDriverInfo] = useState({});

  const fetchData = async () => {
    try {
      setLoading(true);
      const session = JSON.parse(sessionStorage.getItem('driver_session') || '{}');
      setDriverInfo(session);

      const [maintRes, compRes, routesRes] = await Promise.all([
        getTransportMaintenance().catch(() => ({ data: [] })),
        getTransportComplaints().catch(() => ({ data: [] })),
        getTransportRoutes().catch(() => ({ data: [] }))
      ]);

      // Find driver's actual vehicle via route assignment (fallback to session)
      const myRoute = routesRes.data.find(r => r.driver === session.name || r.routeId === session.routeId || r.driver === session.referenceId);
      const myVehicleId = myRoute ? myRoute.vehicle : session.vehicleId;
      
      const myVehicleClean = myVehicleId ? String(myVehicleId).trim().toLowerCase() : '';
      
      // Filter maintenance for my vehicle
      const myMaintenance = maintRes.data.filter(m => 
        m.vehicleNumber && String(m.vehicleNumber).trim().toLowerCase() === myVehicleClean
      );
      
      // Filter complaints assigned to me
      const myNameClean = session.name ? String(session.name).trim().toLowerCase() : '';
      const myIdClean = session.referenceId ? String(session.referenceId).trim().toLowerCase() : '';
      const myRouteClean = myRoute ? String(myRoute.routeId).trim().toLowerCase() : '';
      
      const myComplaints = compRes.data.filter(c => {
        // Hide sensitive complaints related to driver behavior or safety
        const typeClean = (c.complaintType || c.category || '').toLowerCase();
        const descClean = (c.description || '').toLowerCase();
        const sensitiveKeywords = ['driver behavior', 'behavior', 'overspeed', 'speed', 'harassment', 'safety', 'rash', 'misbehave', 'rude'];
        const isSensitive = sensitiveKeywords.some(keyword => typeClean.includes(keyword) || descClean.includes(keyword));
        
        if (isSensitive) return false;

        const assignedClean = c.assignedTo ? String(c.assignedTo).trim().toLowerCase() : '';
        const busClean = c.busNumber ? String(c.busNumber).trim().toLowerCase() : '';
        const routeClean = c.routeId ? String(c.routeId).trim().toLowerCase() : '';

        return (
          (assignedClean && (assignedClean === myNameClean || assignedClean === myIdClean || assignedClean === 'driver')) ||
          (myVehicleClean && busClean === myVehicleClean) ||
          (myRouteClean && routeClean === myRouteClean)
        );
      });

      setMaintenanceTasks(myMaintenance);
      setComplaintTasks(myComplaints);
    } catch (err) {
      console.error('Failed to load tasks', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateMaintenance = async (id, status) => {
    try {
      await updateTransportMaintenance(id, { status });
      fetchData();
      alert(`Maintenance marked as ${status}`);
    } catch (err) {
      alert('Failed to update maintenance status');
    }
  };

  const handleUpdateComplaint = async (id, status) => {
    try {
      await updateTransportComplaint(id, { status });
      fetchData();
      alert(`Complaint marked as ${status}`);
    } catch (err) {
      alert('Failed to update complaint status');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0', color: '#6b7280', fontSize: '1.125rem', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ width: '3rem', height: '3rem', border: '4px solid #eff6ff', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem auto' }}></div>
        Loading tasks...
      </div>
    );
  }

  const pendingMaintenanceCount = maintenanceTasks.filter(m => m.status !== 'Completed').length;
  const pendingComplaintCount = complaintTasks.filter(c => c.status !== 'Resolved').length;

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header Area */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', backgroundColor: '#eff6ff', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckSquare size={24} style={{ color: '#2563eb' }} />
            </div>
            My Tasks
          </h1>
          <p style={{ color: '#6b7280', margin: 0, fontSize: '1rem' }}>View and complete tasks assigned to you by the Transport Admin.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
        
        {/* Maintenance Tasks Column */}
        <div style={{ backgroundColor: 'white', borderRadius: '1rem', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f9fafb' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1f2937' }}>
              <Wrench size={20} style={{ color: '#6b7280' }} /> Vehicle Maintenance
            </h2>
            <span style={{ backgroundColor: '#dbeafe', color: '#1d4ed8', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 'bold' }}>
              {pendingMaintenanceCount} Pending
            </span>
          </div>
          
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
            {maintenanceTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: '#9ca3af' }}>
                <CheckCircle size={32} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
                <p style={{ margin: 0 }}>No maintenance tasks assigned to your vehicle.</p>
              </div>
            ) : (
              maintenanceTasks.map(task => {
                const isCompleted = task.status === 'Completed';
                const isInProgress = task.status === 'In Progress';
                
                return (
                  <div key={task._id} style={{ border: '1px solid #f3f4f6', borderRadius: '0.75rem', padding: '1.25rem', backgroundColor: isCompleted ? '#f0fdf4' : '#fff', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <h3 style={{ fontWeight: 'bold', fontSize: '1.125rem', color: '#111827', margin: '0 0 0.25rem 0' }}>{task.serviceType}</h3>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock size={14} /> Scheduled: {new Date(task.serviceDate).toLocaleDateString()}
                        </p>
                      </div>
                      <span style={{ 
                        padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em',
                        backgroundColor: isCompleted ? '#dcfce7' : isInProgress ? '#fef3c7' : '#f3f4f6',
                        color: isCompleted ? '#16a34a' : isInProgress ? '#b45309' : '#4b5563'
                      }}>
                        {task.status}
                      </span>
                    </div>
                    
                    {task.remarks && (
                      <p style={{ fontSize: '0.875rem', color: '#4b5563', margin: '1rem 0 0 0', padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem', border: '1px solid #e5e7eb', fontStyle: 'italic' }}>
                        "{task.remarks}"
                      </p>
                    )}
                    
                    {!isCompleted && (
                      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
                        {task.status === 'Scheduled' && (
                          <button 
                            onClick={() => handleUpdateMaintenance(task._id, 'In Progress')} 
                            style={{ flex: 1, padding: '0.625rem', backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#fde68a'; }}
                            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#fef3c7'; }}
                          >
                            Start Service
                          </button>
                        )}
                        <button 
                          onClick={() => handleUpdateMaintenance(task._id, 'Completed')} 
                          style={{ flex: 1, padding: '0.625rem', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}
                          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#15803d'; }}
                          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#16a34a'; }}
                        >
                          <CheckCircle size={16} /> Mark Completed
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Complaints/Issues Column */}
        <div style={{ backgroundColor: 'white', borderRadius: '1rem', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FCEBEB' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#991b1b' }}>
              <ShieldCheck size={20} style={{ color: '#ef4444' }} /> Assigned Complaints
            </h2>
            <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 'bold' }}>
              {pendingComplaintCount} Pending
            </span>
          </div>
          
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
            {complaintTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: '#9ca3af' }}>
                <CheckCircle size={32} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
                <p style={{ margin: 0 }}>No complaints assigned to you.</p>
              </div>
            ) : (
              complaintTasks.map(task => {
                const isResolved = task.status === 'Resolved';
                
                return (
                  <div key={task._id} style={{ border: '1px solid #fee2e2', borderRadius: '0.75rem', padding: '1.25rem', backgroundColor: isResolved ? '#f0fdf4' : '#fff', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <h3 style={{ fontWeight: 'bold', fontSize: '1.125rem', color: '#b91c1c', margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <AlertTriangle size={18} /> {task.category || 'General Issue'}
                        </h3>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                          Reported on: {new Date(task.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span style={{ 
                        padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em',
                        backgroundColor: isResolved ? '#dcfce7' : '#fee2e2',
                        color: isResolved ? '#16a34a' : '#b91c1c'
                      }}>
                        {task.status}
                      </span>
                    </div>
                    
                    <p style={{ fontSize: '0.9rem', color: '#374151', margin: '1rem 0 0 0', lineHeight: 1.5 }}>
                      "{task.description}"
                    </p>
                    
                    {!isResolved && (
                      <div style={{ marginTop: '1.25rem' }}>
                        <button 
                          onClick={() => handleUpdateComplaint(task._id, 'Resolved')} 
                          style={{ width: '100%', padding: '0.75rem', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}
                          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#15803d'; }}
                          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#16a34a'; }}
                        >
                          <CheckCircle size={18} /> Mark Resolved
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default DriverTasks;
