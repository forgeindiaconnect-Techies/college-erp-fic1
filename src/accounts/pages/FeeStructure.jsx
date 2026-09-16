import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Save,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  IndianRupee,
  RefreshCw,
  Search,
  BookOpen,
  Building2,
  Calendar,
  Layers3
} from 'lucide-react';
import {
  getFeeStructures,
  saveFeeStructure,
  deleteFeeStructure,
  getDepartments,
  getCourses
} from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';

const DEFAULT_FEE_ITEMS = [
  { feeType: 'Tuition Fee', amount: 25000 },
  { feeType: 'Admission Fee', amount: 10000 },
  { feeType: 'Exam Fee', amount: 5000 },
  { feeType: 'Library Fee', amount: 2000 },
  { feeType: 'Other Fee', amount: 3000 }
];

const ACADEMIC_YEARS = [
  '2026-2027',
  '2025-2026',
  '2024-2025',
  '2023-2024',
  '2027-2028'
];

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

const FeeStructure = () => {
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [department, setDepartment] = useState('');
  const [course, setCourse] = useState('');
  const [semester, setSemester] = useState(1);

  const [fees, setFees] = useState(DEFAULT_FEE_ITEMS);
  const [feeStructuresList, setFeeStructuresList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch real departments and courses from backend
  const fetchMetadata = async () => {
    try {
      const [dRes, cRes] = await Promise.allSettled([
        getDepartments(),
        getCourses()
      ]);

      let loadedDepts = [];
      if (dRes.status === 'fulfilled') {
        loadedDepts = Array.isArray(dRes.value?.data)
          ? dRes.value.data
          : dRes.value?.data?.departments || [];
        setDepartments(loadedDepts);
      }

      let loadedCourses = [];
      if (cRes.status === 'fulfilled') {
        loadedCourses = Array.isArray(cRes.value?.data?.courses)
          ? cRes.value.data.courses
          : Array.isArray(cRes.value?.data)
          ? cRes.value.data
          : [];
        setCourses(loadedCourses);
      }

      if (loadedDepts.length > 0 && !department) {
        const firstDept = loadedDepts[0]?.name || loadedDepts[0]?.departmentName || loadedDepts[0];
        setDepartment(firstDept);
      }
    } catch (err) {
      console.error('Failed to load departments/courses:', err);
    }
  };

  // Fetch Fee Structures
  const loadStructures = async () => {
    try {
      setLoading(true);
      const res = await getFeeStructures();
      const list = Array.isArray(res.data) ? res.data : [];
      setFeeStructuresList(list);

      // Check if current selection matches any existing structure
      if (department && course) {
        const match = list.find(
          s =>
            s.academicYear === academicYear &&
            s.course === course &&
            s.department === department &&
            Number(s.semester) === Number(semester)
        );

        if (match && match.fees && match.fees.length > 0) {
          setFees(match.fees.map(f => ({ feeType: f.feeType, amount: Number(f.amount) || 0 })));
        }
      }
    } catch (err) {
      console.error('Failed to load fee structures:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
    loadStructures();
  }, []);

  useRealtimeSync('departments', fetchMetadata);
  useRealtimeSync('courses', fetchMetadata);
  useRealtimeSync('feeStructure', loadStructures);

  // Filter real courses strictly by selected department
  const availableCourses = useMemo(() => {
    if (!department) return [];

    const deptObj = departments.find(d =>
      (d?.name && d.name.toLowerCase() === department.toLowerCase()) ||
      (d?.id && String(d.id).toLowerCase() === String(department).toLowerCase()) ||
      (d?.code && d.code.toLowerCase() === department.toLowerCase())
    );

    const deptId = deptObj?.id || deptObj?._id || department;
    const deptCode = deptObj?.code || '';
    const deptName = deptObj?.name || department;

    const matched = courses.filter(c => {
      const cDeptId = String(c?.departmentId || '').trim().toLowerCase();
      const cDept = String(c?.department || c?.departmentName || '').trim().toLowerCase();

      return (
        (deptId && cDeptId === String(deptId).trim().toLowerCase()) ||
        (deptCode && cDeptId === String(deptCode).trim().toLowerCase()) ||
        (deptName && cDeptId === String(deptName).trim().toLowerCase()) ||
        (deptName && cDept === String(deptName).trim().toLowerCase()) ||
        (deptCode && cDept === String(deptCode).trim().toLowerCase())
      );
    });

    return matched;
  }, [department, departments, courses]);

  // Handle department change & cascade course
  const handleDepartmentChange = (newDept) => {
    setDepartment(newDept);

    if (!newDept) {
      setCourse('');
      return;
    }

    const deptObj = departments.find(d =>
      (d?.name && d.name.toLowerCase() === newDept.toLowerCase()) ||
      (d?.id && String(d.id).toLowerCase() === String(newDept).toLowerCase()) ||
      (d?.code && d.code.toLowerCase() === newDept.toLowerCase())
    );
    const deptId = deptObj?.id || deptObj?._id || newDept;
    const deptCode = deptObj?.code || '';
    const deptName = deptObj?.name || newDept;

    const matchingCourses = courses.filter(c => {
      const cDeptId = String(c?.departmentId || '').trim().toLowerCase();
      const cDept = String(c?.department || c?.departmentName || '').trim().toLowerCase();

      return (
        (deptId && cDeptId === String(deptId).trim().toLowerCase()) ||
        (deptCode && cDeptId === String(deptCode).trim().toLowerCase()) ||
        (deptName && cDeptId === String(deptName).trim().toLowerCase()) ||
        (deptName && cDept === String(deptName).trim().toLowerCase()) ||
        (deptCode && cDept === String(deptCode).trim().toLowerCase())
      );
    });

    if (matchingCourses.length > 0) {
      setCourse(matchingCourses[0]?.name || matchingCourses[0]?.courseName || '');
    } else {
      setCourse('');
    }
  };

  // When selection changes, load existing fees if structure already saved
  useEffect(() => {
    if (!department || !course) return;

    const match = feeStructuresList.find(
      s =>
        s.academicYear === academicYear &&
        s.course === course &&
        s.department === department &&
        Number(s.semester) === Number(semester)
    );

    if (match && match.fees && match.fees.length > 0) {
      setFees(match.fees.map(f => ({ feeType: f.feeType, amount: Number(f.amount) || 0 })));
    } else {
      setFees(DEFAULT_FEE_ITEMS);
    }
  }, [academicYear, course, department, semester, feeStructuresList]);

  // Handle line item changes
  const handleFeeAmountChange = (index, value) => {
    const updated = [...fees];
    updated[index].amount = Math.max(0, Number(value) || 0);
    setFees(updated);
  };

  const handleFeeTypeChange = (index, value) => {
    const updated = [...fees];
    updated[index].feeType = value;
    setFees(updated);
  };

  const addFeeItem = () => {
    setFees([...fees, { feeType: 'Custom Fee', amount: 0 }]);
  };

  const removeFeeItem = (index) => {
    if (fees.length <= 1) return;
    setFees(fees.filter((_, i) => i !== index));
  };

  const totalAmount = fees.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const handleSave = async (e) => {
    e?.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    if (!department) {
      setErrorMsg('Please select a Department.');
      setSaving(false);
      return;
    }

    if (!course) {
      setErrorMsg('Please select a Course.');
      setSaving(false);
      return;
    }

    try {
      const payload = {
        academicYear,
        course,
        department,
        semester: Number(semester),
        fees: fees.map(f => ({ feeType: f.feeType.trim(), amount: Number(f.amount) || 0 })),
        totalAmount
      };

      await saveFeeStructure(payload);
      setSuccessMsg(`Fee Structure for ${course} (${department}) - Sem ${semester} [${academicYear}] saved successfully!`);
      await loadStructures();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Failed to save fee structure. Please try again.');
      setTimeout(() => setErrorMsg(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this fee structure?')) return;
    try {
      await deleteFeeStructure(id);
      setSuccessMsg('Fee structure deleted.');
      await loadStructures();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete fee structure.');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  const handleSelectExisting = (item) => {
    setAcademicYear(item.academicYear);
    setDepartment(item.department);
    setCourse(item.course);
    setSemester(item.semester);
    if (item.fees && item.fees.length > 0) {
      setFees(item.fees.map(f => ({ feeType: f.feeType, amount: Number(f.amount) || 0 })));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredStructures = feeStructuresList.filter(s => {
    const q = searchQuery.toLowerCase();
    return (
      (s.course || '').toLowerCase().includes(q) ||
      (s.department || '').toLowerCase().includes(q) ||
      (s.academicYear || '').toLowerCase().includes(q) ||
      `sem ${s.semester}`.includes(q)
    );
  });

  return (
    <div className="fee-structure-page" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-main, #1e293b)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers3 size={28} color="#f59e0b" />
            Fee Structure Management
          </h1>
          <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '14px', marginTop: '4px' }}>
            Define and manage semester-wise fee structures per course and department.
          </p>
        </div>

        <button
          onClick={() => {
            fetchMetadata();
            loadStructures();
          }}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid var(--border-color, #e2e8f0)',
            background: 'var(--card-bg, #ffffff)',
            color: 'var(--text-main, #334155)',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '13px'
          }}
        >
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Success / Error Alerts */}
      {successMsg && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: '#dcfce7',
          color: '#15803d',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #bbf7d0',
          fontWeight: '500',
          fontSize: '14px'
        }}>
          <CheckCircle2 size={20} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: '#fee2e2',
          color: '#b91c1c',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #fecaca',
          fontWeight: '500',
          fontSize: '14px'
        }}>
          <AlertCircle size={20} />
          <span>{errorMsg}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', alignItems: 'start' }}>
        {/* Main Fee Structure Card */}
        <div style={{
          background: 'var(--card-bg, #ffffff)',
          borderRadius: '12px',
          border: '1px solid var(--border-color, #e2e8f0)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-color, #e2e8f0)',
            background: 'var(--bg-subtle, #f8fafc)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-main, #0f172a)', margin: 0 }}>
              Fee Structure Setup
            </h2>
            <span style={{
              background: '#fef3c7',
              color: '#d97706',
              fontSize: '12px',
              fontWeight: '600',
              padding: '4px 10px',
              borderRadius: '20px'
            }}>
              Configurator
            </span>
          </div>

          <form onSubmit={handleSave} style={{ padding: '24px' }}>
            {/* Header Selectors */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted, #475569)', marginBottom: '6px' }}>
                  Academic Year
                </label>
                <select
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    background: 'var(--input-bg, #ffffff)',
                    color: 'var(--text-main, #1e293b)',
                    fontSize: '14px',
                    fontWeight: '500',
                    outline: 'none'
                  }}
                >
                  {ACADEMIC_YEARS.map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted, #475569)', marginBottom: '6px' }}>
                  Department *
                </label>
                <select
                  value={department}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    background: 'var(--input-bg, #ffffff)',
                    color: 'var(--text-main, #1e293b)',
                    fontSize: '14px',
                    fontWeight: '500',
                    outline: 'none'
                  }}
                >
                  <option value="">Select Department</option>
                  {departments.map((d, i) => {
                    const dName = d?.name || d?.departmentName || d;
                    return (
                      <option key={d?.id || d?._id || i} value={dName}>
                        {dName}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted, #475569)', marginBottom: '6px' }}>
                  Course *
                </label>
                <select
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    background: 'var(--input-bg, #ffffff)',
                    color: 'var(--text-main, #1e293b)',
                    fontSize: '14px',
                    fontWeight: '500',
                    outline: 'none'
                  }}
                >
                  <option value="">
                    {!department
                      ? 'Select Department First'
                      : availableCourses.length === 0
                      ? 'No courses found for this department'
                      : 'Select Course'}
                  </option>
                  {availableCourses.map((c, i) => {
                    const cName = c?.name || c?.courseName || c;
                    return (
                      <option key={c?.id || c?._id || i} value={cName}>
                        {cName} {c?.code ? `(${c.code})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted, #475569)', marginBottom: '6px' }}>
                  Semester *
                </label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    background: 'var(--input-bg, #ffffff)',
                    color: 'var(--text-main, #1e293b)',
                    fontSize: '14px',
                    fontWeight: '500',
                    outline: 'none'
                  }}
                >
                  {SEMESTERS.map(s => (
                    <option key={s} value={s}>Semester {s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Fee Details Breakdown */}
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-main, #1e293b)', margin: 0 }}>
                  Fee Details
                </h3>
                <button
                  type="button"
                  onClick={addFeeItem}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={15} /> Add Item
                </button>
              </div>

              <div style={{ borderTop: '2px dashed var(--border-color, #cbd5e1)', paddingTop: '12px' }}>
                {fees.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '10px'
                    }}
                  >
                    <input
                      type="text"
                      value={item.feeType}
                      onChange={(e) => handleFeeTypeChange(idx, e.target.value)}
                      placeholder="Fee Type"
                      required
                      style={{
                        flex: 1.5,
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color, #cbd5e1)',
                        background: 'var(--input-bg, #ffffff)',
                        color: 'var(--text-main, #1e293b)',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    />

                    <div style={{ position: 'relative', flex: 1 }}>
                      <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: '600', fontSize: '14px' }}>
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={item.amount}
                        onChange={(e) => handleFeeAmountChange(idx, e.target.value)}
                        placeholder="0"
                        required
                        style={{
                          width: '100%',
                          padding: '8px 12px 8px 26px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color, #cbd5e1)',
                          background: 'var(--input-bg, #ffffff)',
                          color: 'var(--text-main, #1e293b)',
                          fontSize: '14px',
                          fontWeight: '600',
                          textAlign: 'right'
                        }}
                      />
                    </div>

                    {fees.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeFeeItem(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '4px'
                        }}
                        title="Remove Item"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Total Row */}
              <div style={{
                borderTop: '2px dashed var(--border-color, #cbd5e1)',
                paddingTop: '14px',
                marginTop: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main, #0f172a)' }}>
                  Total
                </span>
                <span style={{ fontSize: '20px', fontWeight: '800', color: '#16a34a' }}>
                  ₹{totalAmount.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Save Button */}
            <div style={{ marginTop: '28px' }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'opacity 0.2s'
                }}
              >
                <Save size={18} />
                {saving ? 'Saving...' : 'Save Fee Structure'}
              </button>
            </div>
          </form>
        </div>

        {/* Existing Configured Fee Structures */}
        <div style={{
          background: 'var(--card-bg, #ffffff)',
          borderRadius: '12px',
          border: '1px solid var(--border-color, #e2e8f0)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-color, #e2e8f0)',
            background: 'var(--bg-subtle, #f8fafc)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-main, #0f172a)', margin: 0 }}>
              Configured Fee Structures ({feeStructuresList.length})
            </h2>
          </div>

          <div style={{ padding: '16px 24px' }}>
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search by Course, Department or Year..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  fontSize: '13px'
                }}
              />
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                <RefreshCw size={24} className="spin" style={{ margin: '0 auto 8px' }} />
                <p>Loading fee structures...</p>
              </div>
            ) : filteredStructures.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontSize: '14px' }}>
                No fee structures configured yet. Fill the form on the left and click <b>Save Fee Structure</b>.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '480px', overflowY: 'auto' }}>
                {filteredStructures.map((item) => (
                  <div
                    key={item._id || `${item.course}-${item.department}-${item.semester}`}
                    style={{
                      border: '1px solid var(--border-color, #e2e8f0)',
                      borderRadius: '8px',
                      padding: '14px',
                      background: (item.academicYear === academicYear && item.course === course && item.department === department && Number(item.semester) === Number(semester))
                        ? '#eff6ff'
                        : 'var(--card-bg, #ffffff)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => handleSelectExisting(item)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: '700', fontSize: '14px', color: '#1e3a5f' }}>
                          {item.course} — {item.department}
                        </span>
                        <span style={{
                          background: '#e0f2fe',
                          color: '#0369a1',
                          fontSize: '11px',
                          fontWeight: '600',
                          padding: '2px 8px',
                          borderRadius: '12px'
                        }}>
                          Sem {item.semester}
                        </span>
                        <span style={{
                          background: '#f1f5f9',
                          color: '#475569',
                          fontSize: '11px',
                          fontWeight: '500',
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>
                          {item.academicYear}
                        </span>
                      </div>

                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                        {item.fees?.map(f => `${f.feeType}: ₹${(f.amount || 0).toLocaleString()}`).join(' • ')}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '15px', fontWeight: '700', color: '#16a34a' }}>
                        ₹{(item.totalAmount || 0).toLocaleString()}
                      </span>
                      <button
                        onClick={() => handleDelete(item._id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '4px'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.color = '#ef4444'}
                        onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
                        title="Delete Fee Structure"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeeStructure;
