import React, { useState, useEffect } from 'react';
import { CheckSquare, Wrench, ShieldCheck, Clock, CheckCircle, AlertTriangle, ChevronRight, Check } from 'lucide-react';
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

      const tenantId = session.tenantId || 'mock_college_id';
      const localMaintenance = JSON.parse(localStorage.getItem(`erp_transport_maintenance_${tenantId}`) || '[]');
      const localComplaints = JSON.parse(localStorage.getItem(`erp_transport_complaints_${tenantId}`) || '[]');
      const localRoutes = JSON.parse(localStorage.getItem(`erp_transport_routes_${tenantId}`) || '[]');

      const [maintRes, compRes, routesRes] = await Promise.all([
        getTransportMaintenance().catch(() => ({ data: [] })),
        getTransportComplaints().catch(() => ({ data: [] })),
        getTransportRoutes().catch(() => ({ data: [] }))
      ]);

      const allMaintenance = [
        ...localMaintenance,
        ...(maintRes.data || []).filter(m => !localMaintenance.find(l => l._id === m._id))
      ];
      const allComplaints = [
        ...localComplaints,
        ...(compRes.data || []).filter(c => !localComplaints.find(l => l._id === c._id))
      ];
      const allRoutes = [
        ...localRoutes,
        ...(routesRes.data || []).filter(r => !localRoutes.find(l => l.routeId === r.routeId))
      ];

      const cleanStr = (str) => (str || '').toString().trim().toLowerCase();
      const myRoute = allRoutes.find(r => {
        const rDriver = cleanStr(r.driver);
        const meName = cleanStr(session.name);
        const meId = cleanStr(session.referenceId);
        return rDriver === meName || 
               rDriver === `${meName}(${meId})` || 
               rDriver === `${meName} (${meId})` ||
               rDriver.includes(meName) || 
               rDriver.includes(meId) ||
               (session.routeId && (cleanStr(r.routeId) === cleanStr(session.routeId) || cleanStr(r.name) === cleanStr(session.routeId)));
      });
      const myVehicleId = myRoute ? myRoute.vehicle : (session.vehicleId || session.vehicle);
      const myVehicleClean = myVehicleId ? String(myVehicleId).trim().toLowerCase() : '';
      
      const myMaintenance = allMaintenance.filter(m => 
        m.vehicleNumber && String(m.vehicleNumber).trim().toLowerCase() === myVehicleClean
      );
      
      const myNameClean = session.name ? String(session.name).trim().toLowerCase() : '';
      const myIdClean = session.referenceId ? String(session.referenceId).trim().toLowerCase() : '';
      const myRouteClean = myRoute ? String(myRoute.routeId).trim().toLowerCase() : '';
      
      const myComplaints = allComplaints.filter(c => {
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#2563eb', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid #e0e7ff', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '0.75rem' }}></div>
        <p style={{ fontWeight: 600, fontSize: '0.88rem', color: '#475569' }}>Loading assigned operational tasks...</p>
      </div>
    );
  }

  const pendingMaintenanceCount = maintenanceTasks.filter(m => m.status !== 'Completed').length;
  const pendingComplaintCount = complaintTasks.filter(c => c.status !== 'Resolved').length;

  return (
    <div style={{ padding: '1.25rem 1.5rem', maxWidth: '1440px', margin: '0 auto', fontFamily: 'Inter, -apple-system, sans-serif', color: '#0f172a' }}>
      
      {/* ── Breadcrumb & ERP Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '0.2rem' }}>
            <span>Operations & Compliance</span>
            <ChevronRight size={12} />
            <span style={{ color: '#0f172a' }}>Assigned Maintenance & Tasks</span>
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.01em' }}>
            Driver Work Orders & Task Register
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600, background: '#f1f5f9', padding: '0.2rem 0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
            {pendingMaintenanceCount + pendingComplaintCount} Total Open Actions
          </span>
        </div>
      </div>

      {/* ── Two Column Task List Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
        
        {/* Maintenance Tasks Column */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Wrench size={15} style={{ color: '#2563eb' }} /> Scheduled Vehicle Services
            </h3>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '4px', background: pendingMaintenanceCount > 0 ? '#eff6ff' : '#f1f5f9', color: pendingMaintenanceCount > 0 ? '#1d4ed8' : '#64748b' }}>
              {pendingMaintenanceCount} Pending
            </span>
          </div>

          <div style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {maintenanceTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#94a3b8' }}>
                <CheckCircle size={28} style={{ margin: '0 auto 0.4rem', color: '#16a34a' }} />
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#334155' }}>No Service Work Orders Pending</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>Vehicle maintenance schedule is up-to-date.</div>
              </div>
            ) : (
              maintenanceTasks.map(task => {
                const isCompleted = task.status === 'Completed';
                return (
                  <div key={task._id} style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.75rem', background: isCompleted ? '#f0fdf4' : '#ffffff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>{task.serviceType}</div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: '4px', background: isCompleted ? '#dcfce7' : '#fef3c7', color: isCompleted ? '#166534' : '#b45309' }}>
                        {task.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.4rem' }}>
                      Scheduled Date: {new Date(task.serviceDate).toLocaleDateString()}
                    </div>
                    {task.remarks && (
                      <div style={{ fontSize: '0.75rem', color: '#334155', fontStyle: 'italic', background: '#f8fafc', padding: '0.4rem', borderRadius: '4px', border: '1px solid #f1f5f9', marginBottom: '0.5rem' }}>
                        "{task.remarks}"
                      </div>
                    )}
                    {!isCompleted && (
                      <button 
                        onClick={() => handleUpdateMaintenance(task._id, 'Completed')}
                        style={{ width: '100%', padding: '0.35rem', background: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '4px', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      >
                        <Check size={12} /> Mark Service Done
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Assigned Grievances Column */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldCheck size={15} style={{ color: '#dc2626' }} /> Assigned Defect & Issue Tickets
            </h3>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '4px', background: pendingComplaintCount > 0 ? '#fee2e2' : '#f1f5f9', color: pendingComplaintCount > 0 ? '#b91c1c' : '#64748b' }}>
              {pendingComplaintCount} Open
            </span>
          </div>

          <div style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {complaintTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#94a3b8' }}>
                <CheckCircle size={28} style={{ margin: '0 auto 0.4rem', color: '#16a34a' }} />
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#334155' }}>No Defect Tickets Assigned</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>All passenger and route tasks resolved.</div>
              </div>
            ) : (
              complaintTasks.map(task => {
                const isResolved = task.status === 'Resolved';
                return (
                  <div key={task._id} style={{ border: '1px solid #fee2e2', borderRadius: '6px', padding: '0.75rem', background: isResolved ? '#f0fdf4' : '#ffffff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#b91c1c' }}>{task.category || 'Vehicle Issue'}</div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: '4px', background: isResolved ? '#dcfce7' : '#fee2e2', color: isResolved ? '#166534' : '#b91c1c' }}>
                        {task.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#334155', marginBottom: '0.5rem' }}>
                      "{task.description}"
                    </div>
                    {!isResolved && (
                      <button 
                        onClick={() => handleUpdateComplaint(task._id, 'Resolved')}
                        style={{ width: '100%', padding: '0.35rem', background: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '4px', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      >
                        <Check size={12} /> Mark Defect Resolved
                      </button>
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
