import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Clock, Users, ArrowRight, AlertTriangle, Route as RouteIcon, Target, Activity } from 'lucide-react';
import { getTransportRoutes, getTransportStudents, getTransportDrivers } from '../../api/index';

const DriverRoute = () => {
  const [session, setSession] = useState({});
  const [driverInfo, setDriverInfo] = useState(null);
  const [route, setRoute] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRouteData = async () => {
      try {
        const data = JSON.parse(sessionStorage.getItem('driver_session') || '{}');
        setSession(data);
        
        const driversRes = await getTransportDrivers();
        const me = driversRes.data.find(d => d.driverId === data.referenceId || (data.referenceId === 'DRV001' && d.name.includes('Suresh')));
        setDriverInfo(me);

        if (me && me.routeId) {
          const routesRes = await getTransportRoutes();
          const myRoute = routesRes.data.find(r => r.name === me.routeId || r.routeId === me.routeId);
          setRoute(myRoute);

          const studentsRes = await getTransportStudents();
          const myStudents = studentsRes.data.filter(s => s.routeId === me.routeId);
          setStudents(myStudents);
        }
      } catch (err) {
        console.error('Failed to load route data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRouteData();
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#6b7280' }}>
      <div style={{ width: '3rem', height: '3rem', border: '4px solid #f3e8ff', borderTopColor: '#9333ea', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '1rem' }}></div>
      <p style={{ fontWeight: 'bold' }}>Loading route details...</p>
    </div>
  );

  if (!route) {
    return (
      <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <MapPin style={{ color: '#9333ea' }} /> My Route
        </h1>
        <div style={{ backgroundColor: '#fefce8', border: '1px solid #fef08a', color: '#854d0e', padding: '1.5rem', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <AlertTriangle size={24} />
          <p style={{ fontWeight: 500, margin: 0 }}>You have not been assigned a route yet. Please contact the Transport Admin.</p>
        </div>
      </div>
    );
  }

  const getStudentCountForStop = (stopName) => {
    return students.filter(s => s.pickupPoint === stopName).length;
  };

  const startingPoint = route.points && route.points.length > 0 ? route.points[0] : 'N/A';
  const destination = route.points && route.points.length > 1 ? route.points[route.points.length - 1] : 'N/A';

  return (
    <div className="dashboard-container animate-fade-in" style={{ padding: '2rem', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Premium Header Banner */}
      <div style={{
        background: 'var(--primary)',
        borderRadius: '16px',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.5rem',
        color: '#fff',
        boxShadow: '0 8px 20px -5px rgba(59, 130, 246, 0.3)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-50%', right: '-10%', width: '200px', height: '200px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(30px)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MapPin size={24} /> My Route Schedule
          </h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem', fontWeight: 500 }}>
            View your daily pickup and drop schedule.
          </p>
        </div>
        <div style={{ position: 'relative', zIndex: 1, background: 'rgba(255,255,255,0.15)', padding: '0.4rem 1rem', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.2)', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RouteIcon size={16} /> {route.name}
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="glass-card hover-scale" style={{ flex: '1 1 200px', borderLeft: '4px solid #a855f7' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Route ID</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)', margin: 0 }}>{route.routeId}</p>
        </div>
        <div className="glass-card hover-scale" style={{ flex: '1 1 200px', borderLeft: '4px solid #3b82f6' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Total Stops</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)', margin: 0 }}>{route.points ? route.points.length : 0} Stops</p>
        </div>
        <div className="glass-card hover-scale" style={{ flex: '1 1 200px', borderLeft: '4px solid #f97316' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Total Students</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)', margin: 0 }}>{students.length}</p>
            <span style={{ color: 'var(--text-muted)', fontWeight: 'bold' }}>/ {route.capacity}</span>
          </div>
        </div>
        <div className="glass-card hover-scale" style={{ flex: '1 1 200px', borderLeft: '4px solid #22c55e' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Est. Travel Time</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={20} style={{ color: '#22c55e' }} />
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)', margin: 0 }}>~45 mins</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
        
        {/* Route Stops Timeline */}
        <div style={{ flex: '1 1 600px' }}>
          <div className="glass-card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 2rem 0' }}>
              <Navigation style={{ color: '#3b82f6' }} /> Stops & Pickups
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {route.points && route.points.map((stop, index) => {
                const count = getStudentCountForStop(stop);
                const isFirst = index === 0;
                const isLast = index === route.points.length - 1;
                
                return (
                  <div key={index} style={{ display: 'flex', alignItems: 'stretch', gap: '1.5rem' }}>
                    {/* Left Column: Line and Dot */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '2.5rem', flexShrink: 0 }}>
                      <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', border: isFirst ? '4px solid rgba(34, 197, 94, 0.2)' : isLast ? '4px solid rgba(239, 68, 68, 0.2)' : '4px solid rgba(59, 130, 246, 0.2)', backgroundColor: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 10 }}>
                        {isFirst ? <Target size={16} style={{ color: '#22c55e' }}/> : isLast ? <MapPin size={16} style={{ color: '#ef4444' }}/> : <div style={{ width: '0.75rem', height: '0.75rem', borderRadius: '50%', backgroundColor: '#3b82f6' }}></div>}
                      </div>
                      {!isLast && (
                        <div style={{ width: '2px', flex: 1, backgroundColor: 'var(--border-color)', margin: '0.25rem 0' }}></div>
                      )}
                    </div>
                    
                    {/* Right Column: Stop Details */}
                    <div style={{ flex: 1, paddingBottom: isLast ? '0' : '2rem' }}>
                      <div className="hover-scale" style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                          <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'var(--text-main)', margin: 0 }}>{stop}</h3>
                          <span style={{ fontSize: '0.75rem', fontWeight: 'bold', padding: '0.25rem 0.75rem', borderRadius: '9999px', backgroundColor: isFirst ? 'rgba(34, 197, 94, 0.1)' : isLast ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-primary)', color: isFirst ? '#22c55e' : isLast ? '#ef4444' : 'var(--text-muted)', border: !isFirst && !isLast ? '1px solid var(--border-color)' : 'none' }}>
                            {isFirst ? 'Start Point' : isLast ? 'Destination' : `Stop ${index}`}
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', backgroundColor: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg-primary)' }}>
                              <Users size={12} style={{ color: '#3b82f6' }} />
                            </div>
                          </div>
                          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                            <strong style={{ color: 'var(--text-main)' }}>{count}</strong> Students Boarding here
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DriverRoute;
