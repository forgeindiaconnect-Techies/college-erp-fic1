import React from 'react';
import { BookPlus, X, Building, GraduationCap } from 'lucide-react';

const AddBookModal = ({
  isOpen,
  onClose,
  addBookForm,
  setAddBookForm,
  onSubmit,
  realDeptNames = [],
  realCourseNames = [],
  getCoursesForDepartment = () => []
}) => {
  if (!isOpen) return null;

  return (
    <div className="lib-modal-overlay" style={{ alignItems: 'flex-start', paddingTop: '4vh' }} onClick={onClose}>
      <div className="lib-modal-card animate-fade-in" style={{ maxWidth: '820px', width: '95%' }} onClick={e => e.stopPropagation()}>
        <div className="lib-modal-header border-b border-[var(--border-color)] pb-3">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <BookPlus className="text-primary" size={22} /> Add Book to Catalog
            </h2>
            <p className="text-xs text-muted">Register a new title linked with real ERP academic departments and courses.</p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20}/>
          </button>
        </div>
        <form onSubmit={onSubmit} className="lib-modal-form">
          <div className="form-grid">
            <div className="form-group">
              <label className="text-xs font-bold text-muted">Book ID / Code *</label>
              <input 
                type="text" 
                required 
                placeholder="e.g. LIB001" 
                value={addBookForm.bookId}
                onChange={e => setAddBookForm({ ...addBookForm, bookId: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="text-xs font-bold text-muted">Book Title *</label>
              <input 
                type="text" 
                required 
                placeholder="e.g. Data Structures & Algorithms" 
                value={addBookForm.title}
                onChange={e => setAddBookForm({ ...addBookForm, title: e.target.value })}
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="text-xs font-bold text-muted">Author(s) *</label>
              <input 
                type="text" 
                required 
                placeholder="e.g. Thomas H. Cormen" 
                value={addBookForm.author}
                onChange={e => setAddBookForm({ ...addBookForm, author: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="text-xs font-bold text-muted">Publisher</label>
              <input 
                type="text" 
                placeholder="e.g. MIT Press / Pearson" 
                value={addBookForm.publisher}
                onChange={e => setAddBookForm({ ...addBookForm, publisher: e.target.value })}
              />
            </div>
          </div>

          {/* REAL TIME DEPARTMENT & COURSE / CATEGORY SELECTION */}
          <div className="form-grid">
            <div className="form-group">
              <label className="text-xs font-bold text-muted flex items-center gap-1">
                <Building size={14} className="text-primary" /> Department *
              </label>
              <select 
                required 
                value={addBookForm.department}
                onChange={e => {
                  const newDept = e.target.value;
                  const availCourses = getCoursesForDepartment(newDept);
                  const firstCourse = availCourses[0]?.name || availCourses[0]?.code || realCourseNames[0] || 'General';
                  setAddBookForm({ 
                    ...addBookForm, 
                    department: newDept,
                    category: firstCourse
                  });
                }}
              >
                {realDeptNames.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="text-xs font-bold text-muted flex items-center gap-1">
                <GraduationCap size={14} className="text-primary" /> Course / Category *
              </label>
              <select 
                required 
                value={addBookForm.category}
                onChange={e => setAddBookForm({ ...addBookForm, category: e.target.value })}
              >
                {Array.from(new Set([
                  ...getCoursesForDepartment(addBookForm.department).map(c => c.name || c.code || c),
                  ...realCourseNames
                ])).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="text-xs font-bold text-muted">ISBN</label>
              <input 
                type="text" 
                placeholder="e.g. 978-0262033848" 
                value={addBookForm.isbn}
                onChange={e => setAddBookForm({ ...addBookForm, isbn: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="text-xs font-bold text-muted">Initial Total Copies *</label>
              <input 
                type="number" 
                min="1" 
                required 
                value={addBookForm.totalCopies}
                onChange={e => setAddBookForm({ ...addBookForm, totalCopies: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="text-xs font-bold text-muted">Rack Location</label>
              <input 
                type="text" 
                placeholder="e.g. R01" 
                value={addBookForm.rackNumber}
                onChange={e => setAddBookForm({ ...addBookForm, rackNumber: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="text-xs font-bold text-muted">Shelf Location</label>
              <input 
                type="text" 
                placeholder="e.g. S03" 
                value={addBookForm.shelfNumber}
                onChange={e => setAddBookForm({ ...addBookForm, shelfNumber: e.target.value })}
              />
            </div>
          </div>

          <div className="lib-modal-actions border-t border-[var(--border-color)] pt-4">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary shadow-glow">
              Save & Register Book
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddBookModal;
