import mongoose from 'mongoose';

const transportVehicleMaintenanceSchema = new mongoose.Schema({
  vehicleNumber: { type: String, required: true },
  serviceType: { type: String, required: true }, // General, Oil Change, Repair, Inspection
  serviceDate: { type: Date, required: true },
  nextServiceDate: { type: Date },
  cost: { type: Number, default: 0 },
  remarks: { type: String },
  status: { type: String, enum: ['Completed', 'Scheduled', 'In Progress'], default: 'Scheduled' }
, collegeId: { type: String } }, { timestamps: true });

export default mongoose.model('TransportVehicleMaintenance', transportVehicleMaintenanceSchema);
