import { AsyncLocalStorage } from 'async_hooks';
import mongoose from 'mongoose';

export const context = new AsyncLocalStorage();

// Global Mongoose Plugin for Multi-Tenancy Isolation
mongoose.plugin((schema) => {
  // Intercept all find, findOne, findMany, findOneAndUpdate, etc.
  const queryMethods = [
    'find', 'findOne', 'findOneAndDelete', 'findOneAndRemove', 
    'findOneAndUpdate', 'update', 'updateOne', 'updateMany', 'countDocuments'
  ];

  queryMethods.forEach(method => {
    schema.pre(method, function(next) {
      const store = context.getStore();
      if (store && store.get('collegeId')) {
        // Exclude models that are intentionally global
        if (this.model && ['College', 'SystemSetting', 'User', 'Subscription', 'Attendance'].includes(this.model.modelName)) {
          if (typeof next === 'function') return next();
          return;
        }
        this.where({ collegeId: store.get('collegeId') });
      }
      if (typeof next === 'function') next();
    });
  });

  schema.pre('insertMany', function(next, docs) {
    if (this.modelName && ['College', 'SystemSetting', 'User', 'Subscription', 'Attendance'].includes(this.modelName)) {
      if (typeof next === 'function') return next();
      return;
    }
    const store = context.getStore();
    const cid = (store && store.get('collegeId')) ? store.get('collegeId') : 'unassigned_college';
    
    if (Array.isArray(docs)) {
      docs.forEach(doc => {
        if (!doc.collegeId) doc.collegeId = cid;
      });
    } else if (Array.isArray(next)) {
      next.forEach(doc => {
        if (!doc.collegeId) doc.collegeId = cid;
      });
    }
    if (typeof next === 'function') next();
  });

  schema.pre('aggregate', function(next) {
    const store = context.getStore();
    if (store && store.get('collegeId')) {
      // Cannot reliably get modelName in aggregate hook sometimes, but we can check if it's the College collection
      if (this._model && ['College', 'SystemSetting', 'User', 'Subscription', 'Attendance'].includes(this._model.modelName)) {
        if (typeof next === 'function') return next();
        return;
      }
      this.pipeline().unshift({ $match: { collegeId: store.get('collegeId') } });
    }
    if (typeof next === 'function') next();
  });

  schema.pre('save', function(next) {
    if (this.constructor && ['College', 'SystemSetting', 'User', 'Subscription', 'Attendance'].includes(this.constructor.modelName)) {
      if (typeof next === 'function') return next();
      return;
    }
    const store = context.getStore();
    const cid = (store && store.get('collegeId')) ? store.get('collegeId') : 'unassigned_college';
    
    if (!this.collegeId) {
      this.collegeId = cid;
    }
    if (typeof next === 'function') next();
  });
});
