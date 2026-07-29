import mongoose from 'mongoose';

const transportVehicleSchema = new mongoose.Schema({
  vehicleId: { type: String, required: true, unique: true },
  vehicleNumber: { type: String, required: true }, // e.g. TN-01-AB-1234
  vehicleType: { type: String, required: true, default: 'Bus' }, // Bus, Van
  capacity: { type: Number, required: true, default: 50 },
  registrationNumber: { type: String, required: true },
  insuranceExpiryDate: { type: Date, required: true },
  maintenanceStatus: { type: String, required: true, default: 'Good' }, // Good, Needs Service, Under Maintenance
  assignedRoute: { type: String }, // e.g. Route 1
  status: { type: String, required: true, default: 'Active' }
}, {
  timestamps: true,
});

const TransportVehicle = mongoose.models.TransportVehicle || mongoose.model('TransportVehicle', transportVehicleSchema);

export default TransportVehicle;
