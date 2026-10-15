import { AsyncLocalStorage } from 'async_hooks';
import mongoose from 'mongoose';

export const context = new AsyncLocalStorage();

// Global Mongoose Plugin for Strict Multi-Tenancy Isolation
mongoose.plugin((schema) => {
  // Intercept all find, findOne, findMany, findOneAndUpdate, count, etc.
  const queryMethods = [
    'find', 'findOne', 'findOneAndDelete', 'findOneAndRemove', 
    'findOneAndUpdate', 'update', 'updateOne', 'updateMany', 'countDocuments'
  ];

  // ONLY global system models across all tenants
  const globalModels = [
    'College', 'SystemSetting', 'User', 'Subscription', 'LoginLog', 'ReferralFormConfig', 'ReferralConfigAudit'
  ];

  queryMethods.forEach(method => {
    schema.pre(method, function(next) {
      if (this.getOptions && (this.getOptions().skipTenant || this.getOptions().bypassTenant)) {
        if (typeof next === 'function') return next();
        return;
      }

      const store = context.getStore();
      if (store && store.get('collegeId')) {
        const targetCid = store.get('collegeId');
        
        // Super Admin bypass
        if (targetCid === 'system') {
          if (typeof next === 'function') return next();
          return;
        }

        // Exclude system models
        if (this.model && globalModels.includes(this.model.modelName)) {
          if (typeof next === 'function') return next();
          return;
        }

        // Match against collegeId OR tenantId
        this.where({
          $or: [
            { collegeId: targetCid },
            { tenantId: targetCid }
          ]
        });
      }
      if (typeof next === 'function') next();
    });
  });

  schema.pre('insertMany', function(next, docs) {
    if (this.modelName && globalModels.includes(this.modelName)) {
      if (typeof next === 'function') return next();
      return;
    }
    const store = context.getStore();
    const cid = (store && store.get('collegeId')) ? store.get('collegeId') : null;
    
    if (cid && cid !== 'system') {
      const arr = Array.isArray(docs) ? docs : (Array.isArray(next) ? next : []);
      arr.forEach(doc => {
        if (!doc.collegeId) doc.collegeId = cid;
        if (!doc.tenantId) doc.tenantId = cid;
      });
    }
    if (typeof next === 'function') next();
  });

  schema.pre('aggregate', function(next) {
    const store = context.getStore();
    if (store && store.get('collegeId')) {
      const targetCid = store.get('collegeId');
      if (targetCid === 'system') {
        if (typeof next === 'function') return next();
        return;
      }
      if (this._model && globalModels.includes(this._model.modelName)) {
        if (typeof next === 'function') return next();
        return;
      }
      this.pipeline().unshift({
        $match: {
          $or: [
            { collegeId: targetCid },
            { tenantId: targetCid }
          ]
        }
      });
    }
    if (typeof next === 'function') next();
  });

  schema.pre('save', function(next) {
    if (this.constructor && globalModels.includes(this.constructor.modelName)) {
      if (typeof next === 'function') return next();
      return;
    }
    const store = context.getStore();
    const cid = (store && store.get('collegeId')) ? store.get('collegeId') : null;
    
    if (cid && cid !== 'system') {
      if (!this.collegeId) {
        this.collegeId = cid;
      }
      if (!this.tenantId) {
        this.tenantId = cid;
      }
    }
    if (typeof next === 'function') next();
  });
});
