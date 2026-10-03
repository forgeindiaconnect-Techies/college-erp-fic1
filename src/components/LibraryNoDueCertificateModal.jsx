import React from 'react';
import { ShieldCheck, X, Printer } from 'lucide-react';

const LibraryNoDueCertificateModal = ({ isOpen, onClose, clearance, student }) => {
  if (!isOpen || (!clearance && !student)) return null;

  const item = clearance || {};
  const studentName = item.studentName || item.studentId?.name || student?.name || 'Student';
  const admissionNumber = item.admissionNumber || item.studentId?.admissionNumber || item.studentId?.id || student?.id || student?.admissionNumber || student?.rollNo || '—';
  const department = item.department || item.studentId?.department || item.studentId?.dept || student?.department || student?.dept || 'General';
  const clearedDate = item.approvedAt
    ? new Date(item.approvedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : (item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }));

  const certRef = item.certificateRef || `ERP/LIB-NDC/${new Date().getFullYear()}/${(item._id || item.id || 'C00131').toString().slice(-6).toUpperCase()}`;

  const handlePrint = () => {
    const printContent = document.getElementById('print-no-due-certificate-modal')?.innerHTML;
    const win = window.open('', '_blank', 'width=850,height=750');
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Library No-Due Certificate - ${admissionNumber}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 40px 20px; background: #fff; color: #0f172a; }
            @media print {
              body { padding: 0; margin: 0; }
            }
          </style>
        </head>
        <body>
          <div style="max-width: 680px; margin: 0 auto;">
            ${printContent}
          </div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 300);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '650px', background: '#ffffff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.2s ease-out' }}>
        
        {/* Header */}
        <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={22} style={{ color: '#10b981' }} />
            <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.05rem' }}>Library No-Due Certificate</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: '4px' }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Certificate Paper Canvas */}
        <div style={{ padding: '24px 28px', background: '#f8fafc', overflowY: 'auto', maxHeight: 'calc(85vh - 130px)' }}>
          <div id="print-no-due-certificate-modal" style={{ padding: '28px', background: '#ffffff', color: '#0f172a', textAlign: 'center', borderRadius: '10px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
            <div style={{ border: '3px double #0d9488', padding: '24px', borderRadius: '8px', background: '#fcfdfd' }}>
              
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0d9488', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>
                Central Library & Information Division
              </div>
              
              <h2 style={{ margin: '6px 0 4px', fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                MARUDHAR KESARI JAIN COLLEGE FOR WOMEN
              </h2>
              
              <div style={{ fontSize: '0.76rem', color: '#64748b', marginBottom: '18px' }}>
                Autonomous Institution • Accredited with 'A' Grade
              </div>

              <div style={{ display: 'inline-block', padding: '5px 18px', background: 'rgba(16,185,129,0.12)', border: '1px solid #10b981', color: '#047857', borderRadius: '20px', fontWeight: 800, fontSize: '0.8rem', marginBottom: '22px', letterSpacing: '0.5px' }}>
                NO DUES & LIBRARY CLEARANCE CERTIFICATE
              </div>

              <p style={{ fontSize: '0.92rem', lineHeight: '1.65', color: '#334155', margin: '0 0 20px', textAlign: 'justify', fontFamily: 'sans-serif' }}>
                This is to certify that <strong>{studentName}</strong> (Registration No: <strong>{admissionNumber}</strong>), Department of <strong>{department}</strong>, has returned all borrowed library materials, books, and reference volumes. There are <strong>no outstanding dues, book loans, or unpaid overdue fines</strong> against the student's library card account.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '14px', padding: '12px 16px', background: '#f1f5f9', borderRadius: '8px', textAlign: 'left', fontSize: '0.82rem', fontFamily: 'sans-serif', marginBottom: '24px' }}>
                <div>
                  <span style={{ color: '#64748b' }}>Certificate Ref: </span>
                  <strong style={{ color: '#0f172a' }}>{certRef}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Cleared Date: </span>
                  <strong style={{ color: '#0f172a' }}>{clearedDate}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', fontFamily: 'sans-serif' }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.76rem', color: '#10b981', fontWeight: 800 }}>✓ DIGITALLY VERIFIED BY ERP</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Valid for Exam Hall Ticket & Final Clearance</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a' }}>Librarian / Authority Signature</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Central Library Division</div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ padding: '14px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#10b981', color: '#ffffff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Printer size={15} /> Print Certificate
          </button>
        </div>

      </div>
    </div>
  );
};

export default LibraryNoDueCertificateModal;
