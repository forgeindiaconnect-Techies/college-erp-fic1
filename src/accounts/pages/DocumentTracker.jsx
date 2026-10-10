import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Search, Filter, Plus, FileText, CheckCircle2, Clock, AlertCircle, 
  XCircle, Eye, Upload, Check, X, RefreshCw, ShieldCheck, Users, 
  GraduationCap, Briefcase, Building, UserPlus
} from 'lucide-react';
import api from '../../api';

const DocumentTracker = () => {
  const [documents, setDocuments] = useState([]);
  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [toast, setToast] = useState(null);

  // Requirement Modal State
  const [showRequirementModal, setShowRequirementModal] = useState(false);
  const [newCategory, setNewCategory] = useState('Student');
  const [people, setPeople] = useState([]);
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [peopleError, setPeopleError] = useState('');
  const [savingRequirement, setSavingRequirement] = useState(false);
  const [formMessage, setFormMessage] = useState('');

  // Rejection Modal State
  const [rejectModalDoc, setRejectModalDoc] = useState(null);
  const [rejectRemarks, setRejectRemarks] = useState('');

  const showNotification = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/documents');
      const data = response.data;
      setDocuments(Array.isArray(data) ? data : data.documents || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load document records. Check backend API connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    if (!showRequirementModal) return;

    let active = true;
    const loadPeople = async () => {
      setPeopleLoading(true);
      setPeopleError('');
      setSelectedPersonId('');
      try {
        const endpoint = newCategory === 'Student' ? '/students' : newCategory === 'HOD' ? '/staff/payroll-list' : '/staff';
        const response = await api.get(endpoint);
        const payload = response.data;
        const records = Array.isArray(payload)
          ? payload
          : payload.students || payload.staff || payload.data || [];

        const mapped = records.map(person => {
          const id = String(person.id || person.staffId || person._id || '');
          const role = String(person.role || person.designation || person.category || '').toLowerCase();
          return {
            id,
            name: person.name || person.fullName || person.staffName || 'Unnamed',
            department: person.department || person.dept || 'General',
            isHod: role.includes('hod') || role.includes('head of department')
          };
        }).filter(person => person.id && (
          newCategory !== 'HOD' || person.isHod
        ));

        if (active) {
          setPeople(mapped);
          if (mapped.length === 0) {
            setPeopleError(
              newCategory === 'HOD'
                ? 'No HOD personnel records found in the staff database.'
                : 'No personnel records returned for this category.'
            );
          }
        }
      } catch (err) {
        if (active) {
          setPeople([]);
          setPeopleError(err.response?.data?.message || 'Could not load list of personnel.');
        }
      } finally {
        if (active) setPeopleLoading(false);
      }
    };

    loadPeople();
    return () => { active = false; };
  }, [showRequirementModal, newCategory]);

  const createRequirement = async (event) => {
    event.preventDefault();
    setFormMessage('');

    const person = people.find(item => item.id === selectedPersonId);
    if (!person || !documentType.trim()) {
      setFormMessage('Please select a person and enter a required document title.');
      return;
    }

    try {
      setSavingRequirement(true);
      await api.post('/documents/requirements', {
        personId: person.id,
        personName: person.name,
        category: newCategory,
        department: person.department,
        documentType: documentType.trim()
      });

      setDocumentType('');
      setSelectedPersonId('');
      setShowRequirementModal(false);
      showNotification(`✓ Document requirement "${documentType.trim()}" created for ${person.name}!`);
      await loadDocuments();
    } catch (err) {
      setFormMessage(err.response?.data?.message || 'Could not create the document requirement.');
    } finally {
      setSavingRequirement(false);
    }
  };

  const visibleDocuments = useMemo(() => {
    const term = search.trim().toLowerCase();
    return documents.filter(doc => {
      const matchesCategory = category === 'All' || doc.category === category;
      const matchesStatus = status === 'All' || doc.status === status;
      const matchesSearch = !term || [
        doc.personName, doc.personId, doc.documentType, doc.department
      ].some(value => String(value || '').toLowerCase().includes(term));
      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [documents, category, status, search]);

  const counts = useMemo(() => ({
    total: documents.length,
    submitted: documents.filter(doc => doc.status === 'Submitted').length,
    pending: documents.filter(doc => doc.status === 'Pending Submission').length,
    verified: documents.filter(doc => doc.status === 'Verified').length,
    rejected: documents.filter(doc => doc.status === 'Rejected').length
  }), [documents]);

  const openFile = async (doc) => {
    if (!doc.storedFileName) {
      showNotification('No file has been uploaded for this requirement yet.', 'warning');
      return;
    }
    try {
      setBusyId(doc._id);
      const response = await api.get(`/documents/${doc._id}/file`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], {
        type: doc.mimeType || response.data.type || 'application/octet-stream'
      });
      const url = URL.createObjectURL(blob);
      const tab = window.open(url, '_blank', 'noopener,noreferrer');
      if (!tab) {
        const link = document.createElement('a');
        link.href = url;
        link.download = doc.originalFileName || 'document';
        link.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Could not preview uploaded file.', 'error');
    } finally {
      setBusyId('');
    }
  };

  const updateStatus = async (doc, nextStatus) => {
    if (nextStatus === 'Rejected') {
      setRejectModalDoc(doc);
      setRejectRemarks(doc.remarks || '');
      return;
    }

    try {
      setBusyId(doc._id);
      await api.patch(`/documents/${doc._id}/status`, {
        status: nextStatus,
        remarks: doc.remarks || ''
      });
      showNotification(
        nextStatus === 'Verified' 
          ? `✓ Document "${doc.documentType}" marked as Verified & Approved!`
          : `ℹ Document status updated to ${nextStatus}.`
      );
      await loadDocuments();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Could not update document status.', 'error');
    } finally {
      setBusyId('');
    }
  };

  const handleConfirmRejection = async () => {
    if (!rejectModalDoc) return;
    const finalRemarks = rejectRemarks.trim();
    if (!finalRemarks) {
      showNotification('Please provide a reason for rejecting this document.', 'error');
      return;
    }

    try {
      setBusyId(rejectModalDoc._id);
      await api.patch(`/documents/${rejectModalDoc._id}/status`, {
        status: 'Rejected',
        remarks: finalRemarks
      });
      showNotification(`ℹ Document "${rejectModalDoc.documentType}" marked as Rejected.`);
      setRejectModalDoc(null);
      setRejectRemarks('');
      await loadDocuments();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Could not reject document.', 'error');
    } finally {
      setBusyId('');
    }
  };

  const uploadFile = async (doc, file) => {
    if (!file) return;

    const ext = file.name ? file.name.slice(file.name.lastIndexOf('.')).toLowerCase() : '';
    const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.gif', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv'];
    const isImage = file.type ? file.type.startsWith('image/') : false;
    const isPdf = file.type === 'application/pdf' || ext === '.pdf';
    const isDoc = file.type?.includes('document') || file.type?.includes('msword') || ['.doc', '.docx'].includes(ext);

    if (!allowedExts.includes(ext) && !isImage && !isPdf && !isDoc) {
      showNotification('Please select a valid document or image file (PDF, JPG, PNG, WEBP, DOC, DOCX).', 'error');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      showNotification('File size exceeds the 15 MB limit.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    try {
      setBusyId(doc._id);
      await api.post(`/documents/${doc._id}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      showNotification(`✓ File uploaded successfully for ${doc.personName}!`);
      await loadDocuments();
    } catch (err) {
      showNotification(err.response?.data?.message || 'File upload failed. Check file type and size.', 'error');
    } finally {
      setBusyId('');
    }
  };

  const renderStatusTag = (docStatus) => {
    switch (docStatus) {
      case 'Verified':
        return <span style={{ padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800, background: '#dcfce7', color: '#166534', border: '1px solid #86efac', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={12} /> VERIFIED & APPROVED</span>;
      case 'Submitted':
        return <span style={{ padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800, background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> SUBMITTED (PENDING REVIEW)</span>;
      case 'Rejected':
        return <span style={{ padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800, background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><XCircle size={12} /> REJECTED</span>;
      default:
        return <span style={{ padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800, background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><AlertCircle size={12} /> PENDING SUBMISSION</span>;
    }
  };

  const renderCategoryTag = (cat) => {
    switch (cat) {
      case 'Student':
        return <span style={{ padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 800, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>STUDENT</span>;
      case 'HOD':
        return <span style={{ padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 800, background: '#f3e8ff', color: '#6d28d9', border: '1px solid #e9d5ff' }}>HOD</span>;
      default:
        return <span style={{ padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 800, background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>FACULTY / STAFF</span>;
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div style={{ padding: '1.25rem 1.5rem', maxWidth: '1440px', margin: '0 auto', fontFamily: 'Inter, -apple-system, sans-serif', color: '#0f172a' }}>
      
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          background: toast.type === 'error' ? '#ef4444' : (toast.type === 'warning' ? '#f59e0b' : '#16a34a'),
          color: '#ffffff',
          padding: '0.75rem 1.25rem',
          borderRadius: '8px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
          fontWeight: 700,
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── 1. Page Header (Matching Salary.jsx style) ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: '#2563eb', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', background: '#eff6ff', padding: '0.15rem 0.5rem', borderRadius: '4px', marginBottom: '0.3rem' }}>
            <ShieldCheck size={13} /> Central Accounts & Document Division
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.01em' }}>
            Document Tracker & Compliance Master
          </h1>
          <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
            Comprehensive certificate & identification document audit covering Students, Staff, HODs, and Transport Drivers.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button 
            onClick={() => { setShowRequirementModal(true); setFormMessage(''); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.95rem', borderRadius: '6px', border: '1px solid #166534', background: '#16a34a', color: '#ffffff', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 4px rgba(22,101,52,0.2)' }}
          >
            <UserPlus size={15} /> + Create Requirement
          </button>

          <button 
            onClick={loadDocuments} 
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.95rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
          >
            <RefreshCw size={14} className={loading ? 'spinning' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '6px', color: '#b91c1c', fontSize: '0.84rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} /> {error}
          </div>
          <button onClick={loadDocuments} style={{ padding: '0.3rem 0.75rem', borderRadius: '4px', border: '1px solid #b91c1c', background: '#ffffff', color: '#b91c1c', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      )}

      {/* ── 2. KPI Metrics Strip (Matching Salary.jsx style) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Tracked Requirements</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>{loading ? '…' : counts.total} Documents</div>
          <div style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 600, marginTop: '0.15rem' }}>All active document records</div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Submitted (In Review)</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#b45309', marginTop: '0.2rem' }}>{loading ? '…' : counts.submitted} Uploaded</div>
          <div style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 600, marginTop: '0.15rem' }}>● Awaiting verification audit</div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Pending Submission</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: counts.pending > 0 ? '#dc2626' : '#64748b', marginTop: '0.2rem' }}>{loading ? '…' : counts.pending} Pending</div>
          <div style={{ fontSize: '0.72rem', color: counts.pending > 0 ? '#dc2626' : '#64748b', fontWeight: 600, marginTop: '0.15rem' }}>Action required by user</div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Verified & Approved</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#166534', marginTop: '0.2rem' }}>{loading ? '…' : counts.verified} Approved</div>
          <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600, marginTop: '0.15rem' }}>● Fully compliant records</div>
        </div>
      </div>

      {/* ── 3. Personnel Category Filter Strip (Matching Salary.jsx) ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
        {[
          { key: 'All', label: 'All Personnel', icon: <Users size={13} />, count: counts.total },
          { key: 'Student', label: 'Students', icon: <GraduationCap size={13} />, count: documents.filter(d => d.category === 'Student').length },
          { key: 'Staff', label: 'Faculty & Staff', icon: <Briefcase size={13} />, count: documents.filter(d => d.category === 'Staff').length },
          { key: 'HOD', label: 'HODs & Heads', icon: <Building size={13} />, count: documents.filter(d => d.category === 'HOD').length }
        ].map(cat => (
          <button
            key={cat.key}
            type="button"
            onClick={() => setCategory(cat.key)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.4rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: category === cat.key ? '#2563eb' : '#ffffff',
              color: category === cat.key ? '#ffffff' : '#475569',
              border: category === cat.key ? '1px solid #2563eb' : '1px solid #cbd5e1'
            }}
          >
            {cat.icon}
            <span>{cat.label}</span>
            <span style={{
              fontSize: '0.68rem',
              padding: '0.1rem 0.4rem',
              borderRadius: '10px',
              background: category === cat.key ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
              color: category === cat.key ? '#ffffff' : '#64748b'
            }}>
              {cat.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── 4. Search & Status Toolbar (Matching Salary.jsx) ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.85rem', flexWrap: 'wrap', background: '#ffffff', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '240px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by Employee/Student Name, ID, or Document..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '0.45rem 0.75rem 0.45rem 2rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#f8fafc', color: '#0f172a', outline: 'none' }}
            />
          </div>

          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            style={{ padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontSize: '0.82rem', fontWeight: 600, outline: 'none', cursor: 'pointer' }}
          >
            <option value="All">All Statuses</option>
            <option value="Pending Submission">Pending Submission</option>
            <option value="Submitted">Submitted (Pending Review)</option>
            <option value="Verified">Verified & Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
          Showing <strong style={{ color: '#0f172a' }}>{visibleDocuments.length}</strong> of {documents.length} records
        </div>
      </div>

      {/* ── 5. Data Table (Matching Salary.jsx Table Layout) ── */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: '1100px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', width: '16%', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                  Person Profile
                </th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', width: '10%', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                  Category
                </th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', width: '10%', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                  Department
                </th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', width: '22%', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                  Required Document
                </th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', width: '28%', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                  Audit Status
                </th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', width: '14%', textAlign: 'center', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {!loading && visibleDocuments.map((doc, idx) => {
                const isWorking = busyId === doc._id;

                return (
                  <tr 
                    key={doc._id} 
                    style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}
                  >
                    {/* Person Profile */}
                    <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem' }}>
                        {doc.personName}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace', fontWeight: 600 }}>
                        ID: {doc.personId}
                      </div>
                    </td>

                    {/* Category */}
                    <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                      {renderCategoryTag(doc.category)}
                    </td>

                    {/* Department */}
                    <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                      <span style={{ fontWeight: 700, color: '#334155', fontSize: '0.82rem' }}>
                        {doc.department || 'General'}
                      </span>
                    </td>

                    {/* Required Document */}
                    <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top', wordBreak: 'break-word' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.85rem' }}>
                        {doc.documentType}
                      </div>
                      {doc.originalFileName ? (
                        <div style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                          <FileText size={12} style={{ flexShrink: 0 }} />
                          <span style={{ wordBreak: 'break-all', maxWidth: '100%' }}>{doc.originalFileName}</span>
                          {doc.fileSize > 0 && <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>({formatFileSize(doc.fileSize)})</span>}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '3px' }}>
                          No file attached
                        </div>
                      )}
                    </td>

                    {/* Audit Status */}
                    <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top', wordBreak: 'break-word' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', width: '100%', boxSizing: 'border-box' }}>
                        <div>{renderStatusTag(doc.status)}</div>
                        {doc.verifiedBy && (
                          <div style={{ fontSize: '0.68rem', color: '#475569', fontWeight: 700, marginTop: '2px' }}>
                            By {doc.verifiedBy}
                          </div>
                        )}
                        {doc.remarks && (
                          <div style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 600, marginTop: '4px', background: '#fef2f2', border: '1px solid #fecaca', padding: '0.35rem 0.55rem', borderRadius: '5px', width: '100%', boxSizing: 'border-box', wordBreak: 'break-word', overflowWrap: 'break-word', lineHeight: '1.4' }}>
                            Note: {doc.remarks}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                        {/* View Button */}
                        {doc.storedFileName && (
                          <button
                            type="button"
                            disabled={isWorking}
                            onClick={() => openFile(doc)}
                            style={{
                              width: '92px',
                              padding: '0.35rem 0.5rem',
                              borderRadius: '4px',
                              border: '1px solid #bfdbfe',
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              fontWeight: 700,
                              fontSize: '0.76rem',
                              cursor: isWorking ? 'wait' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}
                            title="View / Download Document"
                          >
                            <Eye size={12} /> View
                          </button>
                        )}

                        {/* Upload Button */}
                        <label style={{
                          width: '92px',
                          padding: '0.35rem 0.5rem',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          color: '#334155',
                          fontWeight: 700,
                          fontSize: '0.76rem',
                          cursor: isWorking ? 'wait' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px'
                        }}>
                          <Upload size={12} /> Upload
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx,application/pdf,image/*"
                            disabled={isWorking}
                            style={{ display: 'none' }}
                            onChange={e => {
                              uploadFile(doc, e.target.files?.[0]);
                              e.target.value = '';
                            }}
                          />
                        </label>

                        {/* Verify Button */}
                        {['Submitted', 'Rejected'].includes(doc.status) && (
                          <button
                            type="button"
                            disabled={isWorking || !doc.storedFileName}
                            onClick={() => updateStatus(doc, 'Verified')}
                            style={{
                              width: '92px',
                              padding: '0.35rem 0.5rem',
                              borderRadius: '4px',
                              border: '1px solid #86efac',
                              background: '#dcfce7',
                              color: '#15803d',
                              fontWeight: 700,
                              fontSize: '0.76rem',
                              cursor: (isWorking || !doc.storedFileName) ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}
                            title="Approve & Verify Document"
                          >
                            <Check size={12} /> Verify
                          </button>
                        )}

                        {/* Reject Button */}
                        {doc.status !== 'Rejected' && doc.status !== 'Verified' && (
                          <button
                            type="button"
                            disabled={isWorking}
                            onClick={() => updateStatus(doc, 'Rejected')}
                            style={{
                              width: '92px',
                              padding: '0.35rem 0.5rem',
                              borderRadius: '4px',
                              border: '1px solid #fca5a5',
                              background: '#fef2f2',
                              color: '#b91c1c',
                              fontWeight: 700,
                              fontSize: '0.76rem',
                              cursor: isWorking ? 'wait' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}
                            title="Reject Document"
                          >
                            <X size={12} /> Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!loading && visibleDocuments.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <FileText size={32} color="#94a3b8" />
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#334155' }}>
                        No Document Records Found
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', maxWidth: '400px' }}>
                        {error ? 'Could not load document records from server.' : 'No document requirements or submissions match your current filters.'}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowRequirementModal(true);
                          setFormMessage('');
                        }}
                        style={{
                          marginTop: '6px',
                          padding: '0.45rem 1rem',
                          borderRadius: '6px',
                          border: 'none',
                          background: '#16a34a',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          cursor: 'pointer'
                        }}
                      >
                        + Create Requirement
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <RefreshCw size={18} className="spinning" color="#2563eb" />
                      <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Loading compliance & document records...</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL: CREATE DOCUMENT REQUIREMENT ── */}
      {showRequirementModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              background: '#0f172a',
              color: '#ffffff',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={18} style={{ color: '#38bdf8' }} />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>
                  Create Document Requirement
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRequirementModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={createRequirement} style={{ padding: '20px' }}>
              {/* Category */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                  Target Category / Role *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {['Student', 'Staff', 'HOD'].map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setNewCategory(cat);
                        setFormMessage('');
                      }}
                      style={{
                        padding: '8px',
                        borderRadius: '6px',
                        border: newCategory === cat ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        background: newCategory === cat ? '#eff6ff' : '#f8fafc',
                        color: newCategory === cat ? '#1d4ed8' : '#475569',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        cursor: 'pointer'
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Person Select */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                  Select Person *
                </label>
                <select
                  value={selectedPersonId}
                  onChange={e => setSelectedPersonId(e.target.value)}
                  required
                  disabled={peopleLoading || people.length === 0}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    outline: 'none'
                  }}
                >
                  <option value="">
                    {peopleLoading ? 'Loading personnel list...' : `-- Select ${newCategory} --`}
                  </option>
                  {people.map(person => (
                    <option key={person.id} value={person.id}>
                      {person.name} ({person.id}) {person.department ? `• ${person.department}` : ''}
                    </option>
                  ))}
                </select>
                {peopleError && (
                  <p style={{ margin: '4px 0 0', color: '#dc2626', fontSize: '0.75rem', fontWeight: 600 }}>
                    {peopleError}
                  </p>
                )}
              </div>

              {/* Document Requirement Title */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                  Required Document Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 10th Marksheet, 12th TC, Aadhaar Card, Degree Certificate..."
                  value={documentType}
                  onChange={e => setDocumentType(e.target.value)}
                  required
                  maxLength={120}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    outline: 'none'
                  }}
                />

                {/* Quick Presets */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '6px' }}>
                  {({
  Student: ['10th Marksheet', '12th Marksheet', '12th TC', 'Aadhaar Card', 'Transfer Certificate'],
  Staff: ['Resume', 'Educational Certificates', 'Aadhaar Card', 'Experience Certificate', 'Relieving Letter'],
  HOD: ['Educational Certificates', 'Experience Certificate', 'Aadhaar Card', 'Appointment Order', 'Department Handover Documents']
}[newCategory] || []).map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDocumentType(preset)}
                      style={{
                        padding: '2px 7px',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        background: '#f1f5f9',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: '#475569',
                        cursor: 'pointer'
                      }}
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              {formMessage && (
                <div style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: formMessage.includes('successfully') ? '#dcfce7' : '#fee2e2',
                  color: formMessage.includes('successfully') ? '#15803d' : '#b91c1c',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  marginBottom: '14px'
                }}>
                  {formMessage}
                </div>
              )}

              {/* Form Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowRequirementModal(false)}
                  style={{
                    padding: '7px 16px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRequirement || peopleLoading || !selectedPersonId || !documentType.trim()}
                  style={{
                    padding: '7px 18px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#16a34a',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: (savingRequirement || peopleLoading || !selectedPersonId || !documentType.trim()) ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 4px rgba(22,101,52,0.2)'
                  }}
                >
                  {savingRequirement ? 'Creating...' : 'Create Requirement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 7. Rejection Audit Reason Modal ── */}
      {rejectModalDoc && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            overflow: 'hidden',
            border: '1px solid #cbd5e1'
          }}>
            {/* Header */}
            <div style={{
              background: '#dc2626',
              color: '#ffffff',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <XCircle size={20} />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                  Reject Document Audit
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRejectModalDoc(null)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '14px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Target Document:</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                  {rejectModalDoc.documentType} — <span style={{ color: '#2563eb' }}>{rejectModalDoc.personName}</span> ({rejectModalDoc.personId})
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                  Rejection Reason / Audit Note *
                </label>
                <textarea
                  rows={4}
                  placeholder="e.g. Please submit the original clear color copy of 12th TC."
                  value={rejectRemarks}
                  onChange={e => setRejectRemarks(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    color: '#0f172a',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setRejectModalDoc(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRejection}
                  disabled={!rejectRemarks.trim() || busyId === rejectModalDoc._id}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#dc2626',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: (!rejectRemarks.trim() || busyId === rejectModalDoc._id) ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 4px rgba(220,38,38,0.2)'
                  }}
                >
                  {busyId === rejectModalDoc._id ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DocumentTracker;



