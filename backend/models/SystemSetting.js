import mongoose from 'mongoose';

const systemSettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'global_config' },
  twoFactorAdmin: { type: Boolean, default: true },
  twoFactorAll: { type: Boolean, default: false },
  forcePasswordReset: { type: Boolean, default: true },
  lockoutPolicy: { type: Boolean, default: true },
  maintenanceMode: { type: Boolean, default: false },
  debugMode: { type: Boolean, default: false },
  emailNotifications: { type: Boolean, default: true },
  smsNotifications: { type: Boolean, default: true },
  academicYear: { type: String, default: '2025-2026' },
  currency: { type: String, default: 'INR (₹)' },
  institutionName: { type: String, default: 'Antigravity College of Engineering' },
  timezone: { type: String, default: 'Asia/Kolkata (IST)' }
, collegeId: { type: String } }, { timestamps: true });

export default mongoose.model('SystemSetting', systemSettingSchema);
