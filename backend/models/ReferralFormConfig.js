import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  productCategory: { type: String, default: 'Standard', trim: true },
  eligibilityConditions: { type: String, default: '', trim: true },
  requiredDocuments: [{ type: String, trim: true }],
  annualFee: { type: String, default: 'Free / Zero Annual Fee' },
  turnaroundTime: { type: String, default: '2-4 business days' },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 }
}, { _id: false });

const partnerSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  code: { type: String, default: '', trim: true },
  logo: { type: String, default: '' },
  category: { type: String, default: '', trim: true },
  website: { type: String, default: '' },
  contactEmail: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  products: [productSchema]
}, { _id: false });

const fieldConfigSchema = new mongoose.Schema({
  fieldKey: { type: String, required: true, trim: true },
  label: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  fieldType: {
    type: String,
    enum: ['text', 'number', 'email', 'phone', 'dropdown', 'radio', 'checkbox', 'date', 'textarea'],
    default: 'text'
  },
  step: { type: Number, default: 1 }, // 1: Applicant/Candidate Info, 2: Referral & Partner details
  isRequired: { type: Boolean, default: false },
  isVisible: { type: Boolean, default: true },
  isSystem: { type: Boolean, default: false }, // System fields cannot be deleted
  placeholder: { type: String, default: '' },
  helpText: { type: String, default: '' },
  validationRule: { type: String, default: '' },
  errorMessage: { type: String, default: '' },
  defaultValue: { type: String, default: '' },
  options: [{ type: String, trim: true }],
  sortOrder: { type: Number, default: 0 }
}, { _id: false });

const referralFormConfigSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      unique: true,
      enum: ['Credit Card', 'Insurance', 'Job', 'Bank Account'],
      index: true
    },
    displayName: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'published',
      index: true
    },
    version: {
      type: Number,
      default: 1
    },
    isActive: {
      type: Boolean,
      default: true
    },
    publishedAt: {
      type: Date,
      default: Date.now
    },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    publishedByName: {
      type: String,
      default: 'Super Admin'
    },
    partners: [partnerSchema],
    categoriesList: [{ type: String, trim: true }],
    fieldsConfig: [fieldConfigSchema],
    generalSettings: {
      allowPartnerReference: { type: Boolean, default: true },
      consentNoticeVersion: { type: String, default: 'v2.4-FIC-CONSENT' },
      consentText: { type: String, default: '' },
      submissionNotice: { type: String, default: '' },
      defaultPartner: { type: String, default: '' }
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedByName: {
      type: String,
      default: 'Super Admin'
    }
  },
  { timestamps: true }
);

export const ReferralFormConfig = mongoose.models.ReferralFormConfig || mongoose.model('ReferralFormConfig', referralFormConfigSchema);
export default ReferralFormConfig;
