import React from 'react';
import { BookOpen, X, FileCheck2, Layers, Plus, Trash2 } from 'lucide-react';

const BookCopiesModal = ({
  isOpen,
  onClose,
  selectedBook,
  bookCopies = [],
  loadingCopies = false,
  newCopyForm,
  setNewCopyForm,
  onAddCopySubmit,
  onUpdateCopyStatus,
  onDeleteCopy
}) => {
  if (!isOpen || !selectedBook) return null;

  return (
    <div className="lib-modal-overlay" onClick={onClose}>
      <div 
        className="lib-modal-card animate-fade-in" 
        style={{ maxWidth: '900px', width: '92%' }} 
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="lib-modal-header border-b border-[var(--border-color)] pb-3">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <BookOpen className="text-primary" size={22} />
              {selectedBook.title}
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Book ID: <span className="font-mono font-bold text-primary">{selectedBook.bookId}</span> • 
              Author: <span className="font-medium">{selectedBook.author}</span>
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Book Information Section */}
          <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5">
              <FileCheck2 size={16} className="text-primary" /> Book Information
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-muted block">ISBN:</span>
                <span className="font-mono font-bold">{selectedBook.isbn || '—'}</span>
              </div>
              <div>
                <span className="text-muted block">Publisher:</span>
                <span className="font-semibold">{selectedBook.publisher || 'MIT Press'}</span>
              </div>
              <div>
                <span className="text-muted block">Edition:</span>
                <span className="font-semibold">{selectedBook.edition || '1st Edition'}</span>
              </div>
              <div>
                <span className="text-muted block">Department:</span>
                <span className="font-semibold">{selectedBook.department || 'CSE'}</span>
              </div>
              <div>
                <span className="text-muted block">Category / Course:</span>
                <span className="font-semibold">{selectedBook.category || 'General'}</span>
              </div>
              <div>
                <span className="text-muted block">Rack / Shelf:</span>
                <span className="font-mono font-semibold">
                  Rack {selectedBook.rackNumber || 'R01'} • Shelf {selectedBook.shelfNumber || 'S01'}
                </span>
              </div>
              <div>
                <span className="text-muted block">Total Copies:</span>
                <span className="font-bold text-sm">{selectedBook.totalCopies || 1} Copies</span>
              </div>
              <div>
                <span className="text-muted block">Available Copies:</span>
                <span className="font-bold text-sm text-emerald-600">
                  {selectedBook.availableCopies !== undefined ? selectedBook.availableCopies : 1} Copies
                </span>
              </div>
            </div>
          </div>

          {/* Physical Copies Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold flex items-center gap-1.5">
                <Layers size={16} className="text-primary" /> Physical Copies ({bookCopies.length})
              </h4>
              {loadingCopies && <span className="text-xs text-muted">Loading copies...</span>}
            </div>

            <div className="border border-[var(--border-color)] rounded-xl overflow-hidden mb-4">
              <table className="w-full text-xs">
                <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
                  <tr>
                    <th className="p-2.5 text-left">Accession No</th>
                    <th className="p-2.5 text-left">Barcode</th>
                    <th className="p-2.5 text-left">Rack</th>
                    <th className="p-2.5 text-left">Shelf</th>
                    <th className="p-2.5 text-left">Condition</th>
                    <th className="p-2.5 text-left">Status</th>
                    <th className="p-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookCopies.map((copy, idx) => (
                    <tr key={copy._id || idx} className="border-b border-[var(--border-color)]/50 hover:bg-primary/5">
                      <td className="p-2.5 font-mono font-bold text-primary">
                        {copy.accessionNumber}
                      </td>
                      <td className="p-2.5 font-mono text-muted">
                        {copy.barcode || '—'}
                      </td>
                      <td className="p-2.5 font-mono font-semibold">
                        {copy.rackNumber || selectedBook.rackNumber || 'R01'}
                      </td>
                      <td className="p-2.5 font-mono font-semibold">
                        {copy.shelfNumber || selectedBook.shelfNumber || 'S01'}
                      </td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          copy.condition === 'New' || copy.condition === 'Good' 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : copy.condition === 'Fair'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                        }`}>
                          {copy.condition}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          copy.status === 'Available'
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : copy.status === 'Issued'
                            ? 'bg-blue-500/10 text-blue-600'
                            : copy.status === 'Reserved'
                            ? 'bg-amber-500/10 text-amber-600'
                            : 'bg-rose-500/10 text-rose-600'
                        }`}>
                          {copy.status}
                        </span>
                      </td>
                      <td className="p-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <select 
                            className="text-[11px] p-1 rounded border border-[var(--border-color)] bg-[var(--bg-card)]"
                            value={copy.status}
                            onChange={e => onUpdateCopyStatus(copy._id, { status: e.target.value })}
                          >
                            <option value="Available">Available</option>
                            <option value="Issued">Issued</option>
                            <option value="Reserved">Reserved</option>
                            <option value="Damaged">Damaged</option>
                            <option value="Lost">Lost</option>
                            <option value="Maintenance">Maintenance</option>
                          </select>
                          <button 
                            className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            onClick={() => onDeleteCopy(copy._id)}
                            title="Delete physical copy"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {bookCopies.length === 0 && !loadingCopies && (
                    <tr>
                      <td colSpan="7" className="text-center p-6 text-muted">
                        No physical copies registered yet. Use the form below to add individual physical copies.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Inline Form: [ + Add Copy ] */}
            <form 
              onSubmit={onAddCopySubmit}
              className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3"
            >
              <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-primary">
                <Plus size={16} /> Add Copy
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                <div className="col-span-2">
                  <label className="text-[11px] font-bold text-muted block mb-1">Accession No *</label>
                  <input 
                    type="text" 
                    required 
                    className="w-full p-2 text-xs rounded border border-[var(--border-color)] bg-[var(--bg-card)] font-mono"
                    placeholder="e.g. ACC-00001"
                    value={newCopyForm.accessionNumber}
                    onChange={e => setNewCopyForm({ ...newCopyForm, accessionNumber: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted block mb-1">Barcode</label>
                  <input 
                    type="text" 
                    className="w-full p-2 text-xs rounded border border-[var(--border-color)] bg-[var(--bg-card)] font-mono"
                    placeholder="e.g. BC-01"
                    value={newCopyForm.barcode}
                    onChange={e => setNewCopyForm({ ...newCopyForm, barcode: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted block mb-1">Rack</label>
                  <input 
                    type="text" 
                    className="w-full p-2 text-xs rounded border border-[var(--border-color)] bg-[var(--bg-card)]"
                    placeholder="e.g. R01"
                    value={newCopyForm.rackNumber}
                    onChange={e => setNewCopyForm({ ...newCopyForm, rackNumber: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted block mb-1">Shelf</label>
                  <input 
                    type="text" 
                    className="w-full p-2 text-xs rounded border border-[var(--border-color)] bg-[var(--bg-card)]"
                    placeholder="e.g. S03"
                    value={newCopyForm.shelfNumber}
                    onChange={e => setNewCopyForm({ ...newCopyForm, shelfNumber: e.target.value })}
                  />
                </div>
                <div className="flex items-end">
                  <button 
                    type="submit" 
                    className="btn-primary w-full py-2 text-xs flex items-center justify-center gap-1 shadow-glow"
                  >
                    <Plus size={14} /> Add Copy
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        <div className="lib-modal-actions border-t border-[var(--border-color)] pt-3">
          <button className="btn-secondary text-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookCopiesModal;
