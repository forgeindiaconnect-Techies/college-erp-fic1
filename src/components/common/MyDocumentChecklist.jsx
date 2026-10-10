import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Upload, Eye, CheckCircle2, Clock, XCircle, AlertCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import api from '../../api';

const MyDocumentChecklist = ({ title = "Required Compliance Documents", category }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [toast, setToast] = useState(null);

  const showNotification = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchMyDocuments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = category ? { category } : {};
      const res = await api.get('/documents/my', { params });
      const raw = Array.isArray(res.data) ? res.data : (res.data.documents || []);
      const filtered = category ? raw.filter(d => d.category === category) : raw;
      setDocuments(filtered);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load your required documents.');
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchMyDocuments();
  }, [fetchMyDocuments]);

  const handleUpload = async (doc, file) => {
    if (!file) return;

    const ext = file.name ? file.name.slice(file.name.lastIndexOf('.')).toLowerCase() : '';
    const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx'];
    const isImage = file.type ? file.type.startsWith('image/') : false;
    const isPdf = file.type === 'application/pdf' || ext === '.pdf';

    if (!allowedExts.includes(ext) && !isImage && !isPdf) {
      showNotification('Please select a PDF, JPG, PNG, WEBP, or Word document.', 'error');
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
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showNotification(`✓ File uploaded successfully for ${doc.documentType}!`);
      await fetchMyDocuments();
    } catch (err) {
      showNotification(err.response?.data?.message || 'File upload failed.', 'error');
    } finally {
      setBusyId('');
    }
  };

  const openFile = async (doc) => {
    if (!doc.storedFileName) return;
    try {
      setBusyId(doc._id);
      const res = await api.get(`/documents/${doc._id}/file`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: doc.mimeType || res.data.type || 'application/octet-stream' });
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
      showNotification(err.response?.data?.message || 'Could not view file.', 'error');
    } finally {
      setBusyId('');
    }
  };

  const renderStatus = (status) => {
    switch (status) {
      case 'Verified':
        return <span style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800, background: '#dcfce7', color: '#166534', border: '1px solid #86efac', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={12} /> VERIFIED & APPROVED</span>;
      case 'Submitted':
        return <span style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800, background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> SUBMITTED (PENDING REVIEW)</span>;
      case 'Rejected':
        return <span style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800, background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><XCircle size={12} /> REJECTED</span>;
      default:
        return <span style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800, background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><AlertCircle size={12} /> PENDING SUBMISSION</span>;
    }
  };

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
          background: toast.type === 'error' ? '#ef4444' : '#16a34a',
          color: '#fff', padding: '0.75rem 1.25rem', borderRadius: '8px',
          fontWeight: 700, fontSize: '0.85rem', boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
        }}>
          {toast.message}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '0.15rem 0.5rem', borderRadius: '4px', marginBottom: '0.2rem' }}>
            <ShieldCheck size={12} /> Official Audit Records
          </div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
            {title}
          </h3>
          <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: '#64748b' }}>
            Document requirements assigned to your account by the Accounts Division.
          </p>
        </div>

        <button
          onClick={fetchMyDocuments}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
        >
          <RefreshCw size={13} className={loading ? 'spinning' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div style={{ padding: '0.65rem 0.85rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {!loading && documents.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748b', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
          <FileText size={28} color="#94a3b8" />
          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#334155', marginTop: '0.5rem' }}>
            No Pending Document Requirements
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>
            All required compliance certificates and identification documents are up to date!
          </div>
        </div>
      )}

      {!loading && documents.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {documents.map(doc => {
            const isWorking = busyId === doc._id;

            return (
              <div key={doc._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', padding: '0.85rem 1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ flex: 1, minWidth: '220px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={16} color="#2563eb" />
                    <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>
                      {doc.documentType}
                    </span>
                  </div>
                  {doc.originalFileName && (
                    <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: '0.2rem' }}>
                      Attached: <strong style={{ color: '#0f172a' }}>{doc.originalFileName}</strong>
                    </div>
                  )}
                  {doc.remarks && (
                    <div style={{ fontSize: '0.74rem', color: '#dc2626', fontWeight: 600, marginTop: '0.2rem' }}>
                      Reason for rejection: {doc.remarks}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {renderStatus(doc.status)}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {doc.storedFileName && (
                      <button
                        type="button"
                        disabled={isWorking}
                        onClick={() => openFile(doc)}
                        style={{ padding: '0.35rem 0.65rem', borderRadius: '4px', border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, fontSize: '0.76rem', cursor: isWorking ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Eye size={13} /> View
                      </button>
                    )}

                    <label style={{ padding: '0.35rem 0.65rem', borderRadius: '4px', border: '1px solid #166534', background: '#16a34a', color: '#ffffff', fontWeight: 700, fontSize: '0.76rem', cursor: isWorking ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Upload size={13} /> {doc.storedFileName ? 'Re-upload' : 'Upload File'}
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,application/pdf,image/*"
                        disabled={isWorking}
                        style={{ display: 'none' }}
                        onChange={e => {
                          handleUpload(doc, e.target.files?.[0]);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyDocumentChecklist;
