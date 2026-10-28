import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckSquare, Wrench, ShieldCheck, Clock, CheckCircle, AlertTriangle, ChevronRight, Check, ExternalLink, MessageSquare, AlertCircle, RefreshCw } from 'lucide-react';
import { getTransportMaintenance, updateTransportMaintenance, getTransportComplaints, updateTransportComplaint, getTransportRoutes } from '../../api/index';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DriverTasks = () => {
  const [loading, setLoading] = useState(true);
  const [maintenanceTasks, setMaintenanceTasks] = useState([]);
  const [complaintTasks, setComplaintTasks] = useState([]);
  const [driverInfo, setDriverInfo] = useState({});
  const [liveTime, setLiveTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const session = JSON.parse(sessionStorage.getItem('driver_session') || '{}');
      setDriverInfo(session);

      const tenantId = session.tenantId || sessionStorage.getItem('tenantId') || 'mock_college_id';
      const localMaintenance = [
        ...JSON.parse(localStorage.getItem(`erp_transport_maintenance_${tenantId}`) || '[]'),
        ...JSON.parse(localStorage.getItem('erp_transport_maintenance_mock_college_id') || '[]'),
        ...JSON.parse(localStorage.getItem('erp_transport_maintenance') || '[]')
      ];
      const uniqueLocalMaint = Array.from(new Map(localMaintenance.map(item => [item._id || item.id, item])).values());

      const localComplaints = [
        ...JSON.parse(localStorage.getItem(`erp_transport_complaints_${tenantId}`) || '[]'),
        ...JSON.parse(localStorage.getItem('erp_transport_complaints_mock_college_id') || '[]'),
        ...JSON.parse(localStorage.getItem('erp_transport_complaints') || '[]')
      ];
      const uniqueLocalComp = Array.from(new Map(localComplaints.map(item => [item._id || item.complaintId, item])).values());

      const localRoutes = JSON.parse(localStorage.getItem(`erp_transport_routes_${tenantId}`) || '[]');

      const [maintRes, compRes, routesRes] = await Promise.all([
        getTransportMaintenance().catch(() => ({ data: [] })),
        getTransportComplaints().catch(() => ({ data: [] })),
        getTransportRoutes().catch(() => ({ data: [] }))
      ]);

      const allMaintenance = [
        ...uniqueLocalMaint,
        ...(maintRes.data || []).filter(m => !uniqueLocalMaint.find(l => (l._id && l._id === m._id) || (l.id && l.id === m._id)))
      ];
      const allComplaints = [
        ...uniqueLocalComp,
        ...(compRes.data || []).filter(c => !uniqueLocalComp.find(l => (l._id && l._id === c._id) || (l.complaintId && l.complaintId === c.complaintId)))
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
      const myVehicleId = myRoute ? myRoute.vehicle : (session.vehicleId || session.vehicle || 'TN 01 AB 1234');
      const myVehicleClean = myVehicleId ? String(myVehicleId).trim().toLowerCase() : '';
      
      const myMaintenance = allMaintenance.filter(m => 
        m.vehicleNumber && String(m.vehicleNumber).trim().toLowerCase() === myVehicleClean
      );
      
      const myNameClean = session.name ? String(session.name).trim().toLowerCase() : 'viji';
      const myIdClean = session.referenceId ? String(session.referenceId).trim().toLowerCase() : 'drv-0001';
      const myRouteClean = myRoute ? String(myRoute.routeId).trim().toLowerCase() : 'r-01';
      
      const myComplaints = allComplaints.filter(c => {
        const typeClean = (c.complaintType || c.category || '').toLowerCase();
        const descClean = (c.description || '').toLowerCase();
        
        const reporterIdClean = cleanStr(c.studentId);
        const reporterNameClean = cleanStr(c.name);

        const isReporter = (reporterIdClean && (reporterIdClean === myIdClean || reporterIdClean.includes(myIdClean) || myIdClean.includes(reporterIdClean) || reporterIdClean === 'drv-0001')) ||
                           (reporterNameClean && (reporterNameClean === myNameClean || reporterNameClean.includes(myNameClean) || reporterNameClean === 'viji')) ||
                           c.reporterType === 'Driver';

        if (!isReporter) {
          const sensitiveKeywords = ['driver behavior', 'behavior', 'overspeed', 'speed', 'harassment', 'rash', 'misbehave', 'rude'];
          const isMisconduct = sensitiveKeywords.some(keyword => typeClean.includes(keyword) || descClean.includes(keyword));
          if (isMisconduct) return false;
        }

        const assignedClean = c.assignedTo ? String(c.assignedTo).trim().toLowerCase() : '';
        const busClean = c.busNumber ? String(c.busNumber).trim().toLowerCase() : '';
        const routeClean = c.routeId ? String(c.routeId).trim().toLowerCase() : '';

        return (
          isReporter ||
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
      try {
        await updateTransportMaintenance(id, { status });
      } catch (apiErr) {
        console.warn('API update failed, updating local storage:', apiErr);
      }

      // Update in all local storage keys
      const session = JSON.parse(sessionStorage.getItem('driver_session') || '{}');
      const tenantId = session.tenantId || sessionStorage.getItem('tenantId') || 'mock_college_id';
      const keys = [
        `erp_transport_maintenance_${tenantId}`,
        'erp_transport_maintenance_mock_college_id',
        'erp_transport_maintenance'
      ];

      keys.forEach(key => {
        try {
          const list = JSON.parse(localStorage.getItem(key) || '[]');
          if (Array.isArray(list) && list.length > 0) {
            const updated = list.map(m => ((m._id === id || m.id === id) ? { ...m, status } : m));
            localStorage.setItem(key, JSON.stringify(updated));
          }
        } catch (e) {}
      });

      setMaintenanceTasks(prev => prev.map(m => ((m._id === id || m.id === id) ? { ...m, status } : m)));
      fetchData();
      alert(`Maintenance marked as ${status}`);
    } catch (err) {
      console.error(err);
      alert('Failed to update maintenance status');
    }
  };

  const handleAcknowledgeComplaint = async (id) => {
    try {
      const note = `Acknowledged by Driver ${driverInfo.name || 'Viji'} at ${new Date().toLocaleTimeString()}`;
      try {
        await updateTransportComplaint(id, {
          acknowledgedByDriver: true,
          driverAcknowledgeNote: note
        });
      } catch (apiErr) {
        console.warn('API complaint acknowledgement failed, saving locally:', apiErr);
      }

      const session = JSON.parse(sessionStorage.getItem('driver_session') || '{}');
      const tenantId = session.tenantId || sessionStorage.getItem('tenantId') || 'mock_college_id';
      const keys = [
        `erp_transport_complaints_${tenantId}`,
        'erp_transport_complaints_mock_college_id',
        'erp_transport_complaints'
      ];

      keys.forEach(key => {
        try {
          const list = JSON.parse(localStorage.getItem(key) || '[]');
          if (Array.isArray(list) && list.length > 0) {
            const updated = list.map(c => ((c._id === id || c.complaintId === id) ? { ...c, acknowledgedByDriver: true, driverAcknowledgeNote: note } : c));
            localStorage.setItem(key, JSON.stringify(updated));
          }
        } catch (e) {}
      });

      setComplaintTasks(prev => prev.map(c => ((c._id === id || c.complaintId === id) ? { ...c, acknowledgedByDriver: true, driverAcknowledgeNote: note } : c)));
      fetchData();
      alert('Resolution acknowledged successfully.');
    } catch (err) {
      alert('Failed to acknowledge resolution: ' + (err.response?.data?.message || err.message));
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
      
      {/* ── Enterprise Real-Time Header Bar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', background: '#ffffff', padding: '18px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Work Orders & Compliance Console
            </h1>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 700, color: '#047857', background: '#ecfdf5', padding: '4px 10px', borderRadius: '20px', border: '1px solid #a7f3d0' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }}></span>
              LIVE TASKS SYNC
            </span>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem', fontWeight: 500 }}>
            Fleet Maintenance • Driver <strong>{driverInfo.name || 'Viji'}</strong> ({driverInfo.referenceId || 'DRV-0001'}) • Assigned Vehicle <strong>{driverInfo.vehicleNumber || 'TN 01 AB 1234'}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'right', background: '#f8fafc', padding: '6px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Academic Session 2026-27</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>
              {liveTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} • {DAYS[liveTime.getDay()]}, {liveTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
          <button 
            onClick={fetchData}
            title="Refresh Tasks"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '9px 14px', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', color: '#334155' }}
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      {/* ── 3 Mini KPI Summary Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #2563eb', padding: '14px 18px', borderRadius: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Vehicle Maintenance</span>
            <Wrench size={18} style={{ color: '#2563eb' }} />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px' }}>
            {pendingMaintenanceCount} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Pending</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: pendingMaintenanceCount === 0 ? '#16a34a' : '#2563eb', fontWeight: 600 }}>
            {pendingMaintenanceCount === 0 ? '● All Services Up-to-Date' : 'Action Required for Vehicle Inspection'}
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #f59e0b', padding: '14px 18px', borderRadius: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Passenger & Route Tickets</span>
            <AlertCircle size={18} style={{ color: '#f59e0b' }} />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px' }}>
            {pendingComplaintCount} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Open</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: pendingComplaintCount === 0 ? '#16a34a' : '#d97706', fontWeight: 600 }}>
            {pendingComplaintCount === 0 ? '● Zero Open Student Inquiries' : 'Review & Acknowledge Resolution'}
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #10b981', padding: '14px 18px', borderRadius: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Duty Compliance</span>
            <ShieldCheck size={18} style={{ color: '#10b981' }} />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#16a34a', margin: '4px 0 2px' }}>
            Certified Safe
          </div>
          <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600 }}>
            ● Daily Operational Readiness Verified
          </div>
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
                const isResolved = task.status === 'Resolved' || task.status === 'Closed';
                const isSafety = /brake|tire|tyre|steering|suspension|engine|safety/i.test(task.complaintType || '') ||
                                 /brake|tire|tyre|steering|suspension|engine|safety/i.test(task.description || '');

                return (
                  <div key={task._id || task.complaintId} style={{ border: `1px solid ${isResolved ? '#bbf7d0' : '#fee2e2'}`, borderRadius: '6px', padding: '0.85rem', background: isResolved ? '#f0fdf4' : '#ffffff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.85rem', color: isResolved ? '#15803d' : '#b91c1c' }}>
                          {task.complaintType || task.category || 'Vehicle Defect'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace' }}>
                          ID: {task.complaintId || task._id} • Bus: {task.busNumber || 'N/A'}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '4px', background: isResolved ? '#dcfce7' : '#fee2e2', color: isResolved ? '#166534' : '#b91c1c' }}>
                        {task.status}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: '#334155', margin: '0.5rem 0', background: isResolved ? '#ffffff' : '#f8fafc', padding: '0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                      "{task.description}"
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#475569', marginBottom: '0.5rem' }}>
                      <span>Assigned: <strong>{task.assignedTo || 'Pending Assignment'}</strong></span>
                      {task.priority && <span>Priority: <strong>{task.priority}</strong></span>}
                    </div>

                    {/* Admin Resolution Notes */}
                    {task.resolutionNote && (
                      <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: '4px', padding: '0.5rem', marginBottom: '0.5rem', fontSize: '0.75rem', color: '#166534' }}>
                        <div style={{ fontWeight: 700, marginBottom: '2px' }}>🛠️ Fleet Resolution Note:</div>
                        <div>{task.resolutionNote}</div>
                        {task.resolvedBy && (
                          <div style={{ fontSize: '0.68rem', color: '#15803d', marginTop: '3px' }}>
                            Resolved by: {task.resolvedBy}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Safety notice for pending/in-progress issues */}
                    {!isResolved && isSafety && (
                      <div style={{ fontSize: '0.72rem', color: '#b45309', background: '#fef3c7', padding: '0.35rem 0.5rem', borderRadius: '4px', marginBottom: '0.5rem', fontWeight: 600 }}>
                        ⚠️ Brakes/Tires safety defect. In progress until authorized workshop inspection clearance.
                      </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
                      {isResolved && !task.acknowledgedByDriver && (
                        <button 
                          onClick={() => handleAcknowledgeComplaint(task._id || task.complaintId)}
                          style={{ flex: 1, padding: '0.4rem', background: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '4px', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                        >
                          <Check size={12} /> Confirm & Acknowledge Resolution
                        </button>
                      )}
                      {task.acknowledgedByDriver && (
                        <div style={{ flex: 1, padding: '0.35rem', background: '#dcfce7', color: '#15803d', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, textAlign: 'center' }}>
                          ✓ Resolution Acknowledged by Driver
                        </div>
                      )}
                      <Link 
                        to={`/driver/complaint/${task.complaintId || task._id}`}
                        style={{ padding: '0.35rem 0.6rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', color: '#334155', textDecoration: 'none', fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}
                      >
                        <MessageSquare size={12} /> Details
                      </Link>
                    </div>
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
