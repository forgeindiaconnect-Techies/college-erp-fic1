import React, { useState, useEffect } from 'react';
import { Users, Search, MapPin, Phone, GraduationCap, Mail } from 'lucide-react';
import { getTransportStudents, getTransportDrivers } from '../../api/index';

const DriverStudents = () => {
  const [session, setSession] = useState({});
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const data = JSON.parse(sessionStorage.getItem('driver_session') || '{}');
        setSession(data);
        
        // Find driver's route
        const driversRes = await getTransportDrivers();
        const me = driversRes.data.find(d => d.driverId === data.referenceId || (data.referenceId === 'DRV001' && d.name.includes('Suresh')));

        if (me && me.routeId) {
          // Fetch all transport students and filter by routeId
          const studentsRes = await getTransportStudents();
          const myStudents = studentsRes.data.filter(s => s.routeId === me.routeId);
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

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.pickupPoint.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header Area */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', backgroundColor: '#eff6ff', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={24} style={{ color: '#2563eb' }} />
            </div>
            Student List
          </h1>
          <p style={{ color: '#6b7280', margin: 0, fontSize: '1rem' }}>View and manage students assigned to your route.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#eff6ff', color: '#2563eb', padding: '0.75rem 1.25rem', borderRadius: '0.75rem', fontWeight: 'bold', gap: '0.5rem', border: '1px solid #bfdbfe' }}>
          <GraduationCap size={20} /> {students.length} Students Assigned
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ backgroundColor: 'white', padding: '1rem 1.5rem', borderRadius: '1rem', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05)', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Search style={{ color: '#9ca3af' }} size={22} />
        <input 
          type="text" 
          placeholder="Search by name, roll number, or pickup point..." 
          style={{ width: '100%', border: 'none', outline: 'none', fontSize: '1rem', color: '#111827', backgroundColor: 'transparent' }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#6b7280', fontSize: '1.125rem' }}>
          <div style={{ width: '3rem', height: '3rem', border: '4px solid #eff6ff', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem auto' }}></div>
          Loading student list...
        </div>
      ) : students.length === 0 ? (
        <div style={{ backgroundColor: 'white', padding: '4rem 2rem', borderRadius: '1rem', border: '1px solid #e5e7eb', textAlign: 'center', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05)' }}>
          <div style={{ width: '4rem', height: '4rem', backgroundColor: '#f3f4f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto', color: '#9ca3af' }}>
            <Users size={32} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827', margin: '0 0 0.5rem 0' }}>No Students Found</h3>
          <p style={{ color: '#6b7280', margin: 0 }}>There are no students assigned to your route yet.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {filteredStudents.map(student => {
            const phone = student.studentProfile?.user?.phone || 'N/A';
            const email = student.studentProfile?.user?.email || 'N/A';

            return (
              <div key={student._id} style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default' }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '1.25rem', flexShrink: 0, boxShadow: '0 2px 4px rgba(37,99,235,0.3)' }}>
                    {student.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontWeight: 'bold', fontSize: '1.125rem', color: '#111827', margin: '0 0 0.25rem 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={student.name}>
                      {student.name}
                    </h3>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#6b7280', backgroundColor: '#f3f4f6', padding: '0.125rem 0.5rem', borderRadius: '9999px', letterSpacing: '0.05em' }}>
                      {student.studentId}
                    </span>
                  </div>
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', flexGrow: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem' }}>
                    <div style={{ width: '1.5rem', height: '1.5rem', borderRadius: '50%', backgroundColor: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <MapPin size={12} style={{ color: '#9333ea' }}/>
                    </div>
                    <span style={{ fontWeight: 600, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={student.pickupPoint}>
                      {student.pickupPoint}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem' }}>
                    <div style={{ width: '1.5rem', height: '1.5rem', borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Phone size={12} style={{ color: '#16a34a' }}/>
                    </div>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>
                      {phone}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem' }}>
                    <div style={{ width: '1.5rem', height: '1.5rem', borderRadius: '50%', backgroundColor: '#ffedd5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Mail size={12} style={{ color: '#ea580c' }}/>
                    </div>
                    <span style={{ color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={email}>
                      {email}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button style={{ flex: 1, padding: '0.6rem', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'background-color 0.2s' }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#dbeafe'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'}
                  >
                    <Phone size={16} /> Call
                  </button>
                  <button style={{ flex: 1, padding: '0.6rem', backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'background-color 0.2s' }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  >
                    <Mail size={16} /> Message
                  </button>
                </div>
              </div>
            );
          })}

          {filteredStudents.length === 0 && searchTerm && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem 0', color: '#6b7280', fontSize: '1rem' }}>
              No students match your search criteria.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DriverStudents;
