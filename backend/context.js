import { AsyncLocalStorage } from 'async_hooks';
import mongoose from 'mongoose';

export const context = new AsyncLocalStorage();

// Global Mongoose Plugin for Strict Multi-Tenancy Isolation
mongoose.plugin((schema) => {
  // Intercept all read, update, and delete queries
  const queryMethods = [
    'find', 'findOne', 'findOneAndDelete', 'findOneAndRemove', 
    'findOneAndUpdate', 'update', 'updateOne', 'updateMany', 'countDocuments', 'count',
    'deleteOne', 'deleteMany'
  ];

  // System-level models that are truly global across tenants
  const globalModels = [
    'College', 'SystemSetting', 'Subscription', 'LoginLog', 'ReferralFormConfig', 'ReferralConfigAudit'
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
        
        // Super Admin system-wide bypass
        if (targetCid === 'system') {
          if (typeof next === 'function') return next();
          return;
        }

        // Exclude system models
        if (this.model && globalModels.includes(this.model.modelName)) {
          if (typeof next === 'function') return next();
          return;
        }

        const rawCids = (store.get('collegeIds') && Array.isArray(store.get('collegeIds')))
          ? store.get('collegeIds')
          : [targetCid];
        const cids = rawCids.filter(Boolean);

        const tenantCond = {
          $or: [
            { collegeId: { $in: cids } },
            { tenantId: { $in: cids } }
          ]
        };

        // Safely merge tenantCond into existing conditions without overwriting existing $or conditions
        if (!this._conditions || Object.keys(this._conditions).length === 0) {
          this._conditions = tenantCond;
        } else if (this._conditions.$and && Array.isArray(this._conditions.$and)) {
          this._conditions.$and.push(tenantCond);
        } else {
          const existingConditions = { ...this._conditions };
          for (const key of Object.keys(this._conditions)) {
            delete this._conditions[key];
          }
          this._conditions.$and = [existingConditions, tenantCond];
        }
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
        if (!doc.collegeId || doc.collegeId === 'COL001' && cid !== 'COL001' || doc.collegeId === 'unassigned_college') {
          doc.collegeId = cid;
        }
        if (!doc.tenantId || doc.tenantId === 'COL001' && cid !== 'COL001' || doc.tenantId === 'unassigned_college') {
          doc.tenantId = cid;
        }
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

      const rawCids = (store.get('collegeIds') && Array.isArray(store.get('collegeIds')))
        ? store.get('collegeIds')
        : [targetCid];
      const cids = rawCids.filter(Boolean);

      this.pipeline().unshift({
        $match: {
          $or: [
            { collegeId: { $in: cids } },
            { tenantId: { $in: cids } }
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
      if (this.isNew) {
        // Enforce the active college ID on newly created documents
        this.collegeId = cid;
        this.tenantId = cid;
      } else {
        if (!this.collegeId || (this.collegeId === 'COL001' && cid !== 'COL001') || this.collegeId === 'unassigned_college') {
          this.collegeId = cid;
        }
        if (!this.tenantId || (this.tenantId === 'COL001' && cid !== 'COL001') || this.tenantId === 'unassigned_college') {
          this.tenantId = cid;
        }
      }
    }
    if (typeof next === 'function') next();
  });
});
