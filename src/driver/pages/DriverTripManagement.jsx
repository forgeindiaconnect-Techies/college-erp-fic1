import React, { useState, useEffect } from 'react';
import { Bus, Clock, PlayCircle, StopCircle, CheckCircle, Navigation, Users } from 'lucide-react';
import { getTransportTrips, createTransportTrip, updateTransportTrip, getTransportRoutes, getTransportDrivers, getTransportStudents } from '../../api/index';

const DriverTripManagement = () => {
  const [session, setSession] = useState({});
  const [myDriverInfo, setMyDriverInfo] = useState(null);
  const [route, setRoute] = useState(null);
  const [students, setStudents] = useState([]);
  
  const [trips, setTrips] = useState([]);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = JSON.parse(sessionStorage.getItem('driver_session') || '{}');
      setSession(data);
      const driverId = data.referenceId;
      if (!driverId) return;

      const driversRes = await getTransportDrivers();
      const me = driversRes.data.find(d => d.driverId === driverId || (driverId === 'DRV001' && d.name.includes('Suresh')));
      setMyDriverInfo(me);

      if (me) {
        const [routesRes, studentsRes, tripsRes] = await Promise.all([
          getTransportRoutes().catch(() => ({ data: [] })),
          getTransportStudents().catch(() => ({ data: [] })),
          getTransportTrips({ driverId }).catch(() => ({ data: [] }))
        ]);

        const myRoute = routesRes.data.find(r => r.name === me.routeId || r.routeId === me.routeId);
        setRoute(myRoute);
        
        const myStudents = studentsRes.data.filter(s => s.routeId === me.routeId);
        setStudents(myStudents);

        const allTrips = tripsRes.data || [];
        setTrips(allTrips);
        
        const todayStr = new Date().toISOString().split('T')[0];
        const activeTrip = allTrips.find(t => t.date === todayStr && (t.status === 'Started' || t.status === 'Scheduled'));
        setCurrentTrip(activeTrip);
      }
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
        driverId: myDriverInfo.driverId,
        vehicleId: myDriverInfo.vehicleId,
        routeId: myDriverInfo.routeId,
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
      alert('Trip Started!');
      fetchData();
    } catch (err) {
      console.error('Failed to start trip', err);
      alert('Failed to start trip');
    }
  };

  const handleEndTrip = async () => {
    if (!currentTrip) return;
    try {
      const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      await updateTransportTrip(currentTrip._id, {
        status: 'Completed',
        endTime: nowTime
      });
      alert('Trip Ended Successfully!');
      fetchData();
    } catch (err) {
      console.error('Failed to end trip', err);
      alert('Failed to end trip');
    }
  };

  const handleToggleBoarding = async (trackingIndex) => {
    if (!currentTrip) return;
    try {
      const updatedTracking = [...currentTrip.studentTracking];
      updatedTracking[trackingIndex].boarded = !updatedTracking[trackingIndex].boarded;
      if (updatedTracking[trackingIndex].boarded) {
        updatedTracking[trackingIndex].time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      } else {
        updatedTracking[trackingIndex].time = null;
      }

      const res = await updateTransportTrip(currentTrip._id, { studentTracking: updatedTracking });
      setCurrentTrip(res.data);
      // Update trips list
      setTrips(trips.map(t => t._id === res.data._id ? res.data : t));
    } catch (err) {
      console.error('Failed to update tracking', err);
    }
  };

  if (loading) return <div className="p-8">Loading trip data...</div>;

  const todayStr = new Date().toISOString().split('T')[0];
  const completedToday = trips.find(t => t.date === todayStr && t.status === 'Completed');

  return (
    <div className="dashboard-container animate-fade-in" style={{ padding: '2rem', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Premium Header Banner */}
      <div style={{
        background: 'var(--primary)',
        borderRadius: '20px',
        padding: '2.5rem',
        marginBottom: '2.5rem',
        color: '#fff',
        boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.4)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-50%', right: '-10%', width: '300px', height: '300px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(40px)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Navigation size={28} /> Trip Management
          </h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '1rem', fontWeight: 500 }}>
            Start, end, and track your active transport trip in real-time.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Active Trip Controls */}
        <div className="lg:col-span-2">
          <div className="glass-card h-full flex flex-col justify-center items-center text-center p-8">
            {completedToday ? (
              <div className="text-green-600 dark:text-green-500 flex flex-col items-center">
                <CheckCircle size={64} className="mb-4" />
                <h2 className="text-2xl font-bold mb-2">Trip Completed</h2>
                <p className="text-gray-500">You have already completed today's trip.</p>
                <p className="mt-4 font-mono bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-lg">
                  {completedToday.startTime} - {completedToday.endTime}
                </p>
              </div>
            ) : currentTrip && currentTrip.status === 'Started' ? (
              <div className="w-full max-w-md">
                <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 mx-auto mb-4 animate-pulse">
                  <Bus size={40} />
                </div>
                <h2 className="text-2xl font-bold mb-2 text-blue-600">Trip in Progress</h2>
                <p className="text-gray-500 font-mono mb-8">Started at {currentTrip.startTime}</p>
                <button 
                  onClick={handleEndTrip}
                  className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white p-4 rounded-xl font-bold shadow-lg shadow-red-600/20 transition-colors"
                >
                  <StopCircle size={24} /> End Trip
                </button>
              </div>
            ) : (
              <div className="w-full max-w-md">
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-400 mx-auto mb-4">
                  <Bus size={40} />
                </div>
                <h2 className="text-2xl font-bold mb-2">Ready to Start?</h2>
                <p className="text-gray-500 mb-8">Make sure your vehicle is ready before starting the trip.</p>
                <button 
                  onClick={handleStartTrip}
                  disabled={!myDriverInfo}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white p-4 rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-colors"
                >
                  <PlayCircle size={24} /> Start Trip
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Trip Info */}
        <div className="space-y-4">
          <div className="glass-card hover-scale">
            <h3 className="font-bold text-gray-500 uppercase text-xs mb-2 tracking-wider">Assigned Route</h3>
            <p className="text-xl font-bold" style={{ color: 'var(--text-main)' }}>{route?.name || 'Loading...'}</p>
          </div>
          <div className="glass-card hover-scale">
            <h3 className="font-bold text-gray-500 uppercase text-xs mb-2 tracking-wider">Assigned Vehicle</h3>
            <p className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}><Bus size={20} className="text-blue-500"/> {myDriverInfo?.vehicleId || 'Loading...'}</p>
          </div>
          <div className="glass-card hover-scale">
            <h3 className="font-bold text-gray-500 uppercase text-xs mb-2 tracking-wider">Total Students</h3>
            <p className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}><Users size={20} className="text-orange-500"/> {students.length}</p>
          </div>
        </div>
      </div>

      {/* Student Tracking (Only visible during active trip) */}
      {currentTrip && currentTrip.status === 'Started' && (
        <div className="glass-card p-0 overflow-hidden mb-8">
          <div className="p-6 flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
            <h2 className="text-xl font-bold text-blue-900 dark:text-blue-100 flex items-center gap-2"><Users size={20}/> Student Boarding Checklist</h2>
            <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-sm">
              {currentTrip.studentTracking.filter(t => t.boarded).length} / {currentTrip.studentTracking.length} Boarded
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 text-sm border-b border-gray-200 dark:border-gray-800">
                  <th className="p-4 font-medium">Student Name</th>
                  <th className="p-4 font-medium">Pickup Point</th>
                  <th className="p-4 font-medium text-center">Boarded Status</th>
                  <th className="p-4 font-medium text-center">Time</th>
                </tr>
              </thead>
              <tbody>
                {currentTrip.studentTracking.map((track, idx) => {
                  const studentInfo = students.find(s => s.studentId === track.studentId);
                  return (
                    <tr key={idx} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="p-4 font-bold">{studentInfo?.name || track.studentId}</td>
                      <td className="p-4">{track.pickupPoint}</td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => handleToggleBoarding(idx)}
                          className={`w-full py-2 rounded-lg font-bold transition-colors ${track.boarded ? 'bg-green-100 text-green-700 dark:bg-green-900/30' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'}`}
                        >
                          {track.boarded ? 'Yes (Boarded)' : 'No'}
                        </button>
                      </td>
                      <td className="p-4 text-center font-mono text-sm text-gray-500">
                        {track.time || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Trip History */}
      <div className="glass-card p-0 overflow-hidden">
        <div className="p-6" style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
          <h2 className="text-xl font-bold flex items-center gap-2"><Clock size={20} className="text-gray-400" /> Trip History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 text-sm border-b border-gray-200 dark:border-gray-800">
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Start Time</th>
                <th className="p-4 font-medium">End Time</th>
                <th className="p-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {trips.filter(t => t.status === 'Completed' || t.status === 'Delayed').length === 0 ? (
                <tr><td colSpan="4" className="text-center p-8 text-gray-500">No past trips found.</td></tr>
              ) : (
                trips.filter(t => t.status === 'Completed' || t.status === 'Delayed').map((trip, idx) => (
                  <tr key={idx} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="p-4 font-medium">{trip.date}</td>
                    <td className="p-4 font-mono">{trip.startTime || '-'}</td>
                    <td className="p-4 font-mono">{trip.endTime || '-'}</td>
                    <td className="p-4">
                      <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-green-100 text-green-700">
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
