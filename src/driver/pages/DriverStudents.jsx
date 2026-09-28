import React, { useState, useEffect } from 'react';
import { Users, Search, MapPin, Phone, GraduationCap, Mail, ChevronRight, Check, X, Compass, CheckCircle } from 'lucide-react';
import { getTransportStudents, getTransportDrivers, getTransportRoutes } from '../../api/index';

const DriverStudents = () => {
  const [session, setSession] = useState({});
  const [students, setStudents] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [studentStatus, setStudentStatus] = useState(() => {
    return JSON.parse(localStorage.getItem('driver_student_status') || '{}');
  });

  const updateStudentStatus = (studentId, status) => {
    const updated = {
      ...studentStatus,
      [studentId]: status
    };

    setStudentStatus(updated);
    localStorage.setItem(
      'driver_student_status',
      JSON.stringify(updated)
    );
  };

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const data = JSON.parse(sessionStorage.getItem('driver_session') || '{}');
        setSession(data);
        
        const driverId = data.referenceId || data._id;
        const tenantId = data.tenantId || 'mock_college_id';
        if (!driverId) { setLoading(false); return; }

        const localDrivers = JSON.parse(localStorage.getItem(`erp_transport_drivers_${tenantId}`) || '[]');
        const localRoutes  = JSON.parse(localStorage.getItem(`erp_transport_routes_${tenantId}`)  || '[]');
        const localStudents = JSON.parse(localStorage.getItem(`erp_transport_students_${tenantId}`) || '[]');

        const [driversRes, routesRes, studentsRes] = await Promise.all([
          getTransportDrivers().catch(() => ({ data: [] })),
          getTransportRoutes().catch(() => ({ data: [] })),
          getTransportStudents().catch(() => ({ data: [] }))
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

        const cleanStr = (str) => (str || '').toString().trim().toLowerCase();
        const me = allDrivers.find(d => 
          (d.driverId && (cleanStr(d.driverId) === cleanStr(driverId) || cleanStr(d.driverId) === cleanStr(data.referenceId))) ||
          (d.email && cleanStr(d.email) === cleanStr(data.email)) ||
          (d.phone && cleanStr(d.phone).replace(/\s+/g, '') === cleanStr(driverId).replace(/\s+/g, '')) ||
          (d.name && (cleanStr(d.name) === cleanStr(data.name) || cleanStr(d.name) === cleanStr(driverId))) ||
          (d._id && (cleanStr(d._id) === cleanStr(driverId) || cleanStr(d._id) === cleanStr(data.referenceId)))
        );

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

        if (myRoute) {
          const myStudents = allStudents.filter(s => s.routeId === myRoute.routeId || cleanStr(s.routeId) === cleanStr(myRoute.name));
          setStudents(myStudents);
        }
      } catch (err) {
        console.error('Failed to load students', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  const totalCount = students.length;
  const pickedUpCount = students.filter(s => studentStatus[s.studentId] === 'PICKED UP').length;
  const absentCount = students.filter(s => studentStatus[s.studentId] === 'ABSENT').length;
  const droppedCount = students.filter(s => studentStatus[s.studentId] === 'DROPPED').length;

  const filteredStudents = students.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.pickupPoint && s.pickupPoint.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const status = studentStatus[s.studentId] || 'PENDING';
    const matchFilter = selectedFilter === 'ALL' || status === selectedFilter;

    return matchSearch && matchFilter;
  });

  return (
    <div style={{ padding: '1.25rem 1.5rem', maxWidth: '1440px', margin: '0 auto', fontFamily: 'Inter, -apple-system, sans-serif', color: '#0f172a' }}>
      
      {/* ── Breadcrumb & ERP Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '0.2rem' }}>
            <span>Transport Operations</span>
            <ChevronRight size={12} />
            <span style={{ color: '#0f172a' }}>Student Passenger Manifest</span>
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.01em' }}>
            Student Transit & Attendance Register
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600, background: '#f1f5f9', padding: '0.25rem 0.65rem', borderRadius: '4px' }}>
            Route: {routeInfo?.name || 'EAST'}
          </span>
        </div>
      </div>

      {/* ── Compact Transit KPI Bar ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div 
          onClick={() => setSelectedFilter('ALL')}
          style={{ background: '#ffffff', padding: '0.85rem 1rem', borderRadius: '8px', border: selectedFilter === 'ALL' ? '2px solid #2563eb' : '1px solid #e2e8f0', cursor: 'pointer' }}
        >
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Enrolled</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>{totalCount}</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>All Registered Students</div>
        </div>

        <div 
          onClick={() => setSelectedFilter('PICKED UP')}
          style={{ background: '#ffffff', padding: '0.85rem 1rem', borderRadius: '8px', border: selectedFilter === 'PICKED UP' ? '2px solid #16a34a' : '1px solid #e2e8f0', cursor: 'pointer' }}
        >
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Onboard (Picked Up)</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#16a34a', marginTop: '0.2rem' }}>{pickedUpCount}</div>
          <div style={{ fontSize: '0.72rem', color: '#16a34a', marginTop: '0.15rem' }}>Currently in Vehicle</div>
        </div>

        <div 
          onClick={() => setSelectedFilter('ABSENT')}
          style={{ background: '#ffffff', padding: '0.85rem 1rem', borderRadius: '8px', border: selectedFilter === 'ABSENT' ? '2px solid #dc2626' : '1px solid #e2e8f0', cursor: 'pointer' }}
        >
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>Reported Absent</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#dc2626', marginTop: '0.2rem' }}>{absentCount}</div>
          <div style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: '0.15rem' }}>Not Boarded</div>
        </div>

        <div 
          onClick={() => setSelectedFilter('DROPPED')}
          style={{ background: '#ffffff', padding: '0.85rem 1rem', borderRadius: '8px', border: selectedFilter === 'DROPPED' ? '2px solid #7c3aed' : '1px solid #e2e8f0', cursor: 'pointer' }}
        >
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' }}>Dropped Off</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#7c3aed', marginTop: '0.2rem' }}>{droppedCount}</div>
          <div style={{ fontSize: '0.72rem', color: '#7c3aed', marginTop: '0.15rem' }}>Reached Stop/Campus</div>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: '420px' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input 
            type="text" 
            placeholder="Search student by name, roll #, or pickup stop..." 
            style={{ width: '100%', padding: '0.45rem 0.65rem 0.45rem 2rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none', background: '#ffffff', color: '#0f172a' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}>
          <span style={{ color: '#64748b', fontWeight: 600 }}>Filter Status:</span>
          {['ALL', 'PENDING', 'PICKED UP', 'DROPPED', 'ABSENT'].map(f => (
            <button
              key={f}
              onClick={() => setSelectedFilter(f)}
              style={{
                padding: '0.2rem 0.55rem',
                borderRadius: '4px',
                border: selectedFilter === f ? '1px solid #2563eb' : '1px solid #e2e8f0',
                background: selectedFilter === f ? '#eff6ff' : '#ffffff',
                color: selectedFilter === f ? '#1d4ed8' : '#64748b',
                fontWeight: 700,
                fontSize: '0.72rem',
                cursor: 'pointer'
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ── Student Manifest Table ── */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Users size={15} style={{ color: '#2563eb' }} /> Passenger Boarding List
          </h3>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Showing {filteredStudents.length} of {students.length}</span>
        </div>

        {filteredStudents.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8' }}>
            <Users size={32} style={{ color: '#cbd5e1', margin: '0 auto 0.5rem' }} />
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#334155' }}>No Students Found</div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>Try adjusting your search query or filter.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '0.65rem 1rem' }}>Student Name</th>
                  <th style={{ padding: '0.65rem 1rem' }}>Student / Roll ID</th>
                  <th style={{ padding: '0.65rem 1rem' }}>Pickup Point</th>
                  <th style={{ padding: '0.65rem 1rem' }}>Parent Phone</th>
                  <th style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>Current Status</th>
                  <th style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>Action Buttons</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => {
                  const phone = student.studentProfile?.user?.phone || 'N/A';
                  const status = studentStatus[student.studentId] || 'PENDING';

                  return (
                    <tr key={student._id || student.studentId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.65rem 1rem', fontWeight: 700, color: '#0f172a' }}>
                        {student.name}
                      </td>
                      <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace', color: '#64748b' }}>
                        {student.studentId}
                      </td>
                      <td style={{ padding: '0.65rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#334155', fontWeight: 600 }}>
                          <MapPin size={13} style={{ color: '#2563eb' }} />
                          {student.pickupPoint || 'Campus Stop'}
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
                            ✓ Pick
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

    </div>
  );
};

export default DriverStudents;
