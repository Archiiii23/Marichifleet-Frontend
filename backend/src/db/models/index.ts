import mongoose, { Schema, Document } from 'mongoose';

// --- USER MODEL (Google Auth & Role) ---
export interface IUser {
  userId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  googleId?: string;
  authProvider: 'google' | 'local' | 'demo';
  role: string;
  tenantId: string;
  orgId: string;
  branches: string[];
  permissions: string[];
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  userId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true },
  avatarUrl: { type: String },
  googleId: { type: String, sparse: true },
  authProvider: { type: String, enum: ['google', 'local', 'demo'], default: 'local' },
  role: { type: String, default: 'FLEET_OWNER' },
  tenantId: { type: String, required: true, default: 'tenant_delhi_01' },
  orgId: { type: String, default: 'org_marichi_logistics' },
  branches: { type: [String], default: ['DL-Okhla', 'MH-Bhiwandi'] },
  permissions: { type: [String], default: ['*'] },
  createdAt: { type: Date, default: Date.now },
});

export const UserModel = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

// --- VEHICLE MODEL ---
export interface IVehicle {
  id: string;
  tenantId: string;
  regNumber: string;
  model: string;
  capacityTons: number;
  type: string;
  status: string;
  fuelLevelPercent: number;
  batteryVolts: number;
  odometerKm: number;
  assignedDriverId?: string;
  currentTripId?: string;
  currentLocation?: {
    latitude: number;
    longitude: number;
    address: string;
    speedKmH: number;
    bearing: number;
    updatedAt: Date;
  };
  documents?: {
    rcValidUntil?: string;
    fitnessValidUntil?: string;
    insuranceValidUntil?: string;
    pucValidUntil?: string;
  };
  createdAt: Date;
}

const VehicleSchema = new Schema<IVehicle>({
  id: { type: String, required: true, unique: true },
  tenantId: { type: String, required: true, index: true },
  regNumber: { type: String, required: true },
  model: { type: String, required: true },
  capacityTons: { type: Number, required: true },
  type: { type: String, default: 'CONTAINER_CLOSED' },
  status: { type: String, default: 'AVAILABLE' },
  fuelLevelPercent: { type: Number, default: 85 },
  batteryVolts: { type: Number, default: 24.5 },
  odometerKm: { type: Number, default: 0 },
  assignedDriverId: { type: String },
  currentTripId: { type: String },
  currentLocation: {
    latitude: Number,
    longitude: Number,
    address: String,
    speedKmH: Number,
    bearing: Number,
    updatedAt: { type: Date, default: Date.now },
  },
  documents: {
    rcValidUntil: String,
    fitnessValidUntil: String,
    insuranceValidUntil: String,
    pucValidUntil: String,
  },
  createdAt: { type: Date, default: Date.now },
});

export const VehicleModel = mongoose.models.Vehicle || mongoose.model<IVehicle>('Vehicle', VehicleSchema);

// --- DRIVER MODEL ---
export interface IDriver {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  licenseNumber: string;
  licenseValidUntil: string;
  status: string;
  currentTripId?: string;
  rating: number;
  totalTripsCompleted: number;
  aadhaarLast4?: string;
  settlementPendingAmount: number;
  createdAt: Date;
}

const DriverSchema = new Schema<IDriver>({
  id: { type: String, required: true, unique: true },
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  licenseNumber: { type: String, required: true },
  licenseValidUntil: { type: String, required: true },
  status: { type: String, default: 'AVAILABLE' },
  currentTripId: { type: String },
  rating: { type: Number, default: 5.0 },
  totalTripsCompleted: { type: Number, default: 0 },
  aadhaarLast4: { type: String, default: '0000' },
  settlementPendingAmount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export const DriverModel = mongoose.models.Driver || mongoose.model<IDriver>('Driver', DriverSchema);

// --- TRIP MODEL ---
export interface ITrip {
  id: string;
  tenantId: string;
  bookingId?: string;
  clientName: string;
  origin: string;
  destination: string;
  vehicleRegNumber: string;
  driverId?: string;
  driverName: string;
  driverPhone: string;
  cargoDescription?: string;
  weightTons: number;
  totalDistanceKm: number;
  completedDistanceKm: number;
  status: string;
  slaStatus: string;
  eta?: Date;
  dispatchedAt?: Date;
  freightAmount: number;
  advancePaid: number;
  detentionAccrued: number;
  checkpoints?: Array<{ name: string; timestamp?: Date; status: string }>;
  pod?: {
    signedByName: string;
    podPhotoUrl?: string;
    submittedAt?: Date;
    isCleanPOD?: boolean;
    shortageUnits?: number;
    damageUnits?: number;
  };
  ewayBillNumber?: string;
  ewayBillValidUntil?: Date;
  createdAt: Date;
}

const TripSchema = new Schema<ITrip>({
  id: { type: String, required: true, unique: true },
  tenantId: { type: String, required: true, index: true },
  bookingId: { type: String },
  clientName: { type: String, required: true },
  origin: { type: String, required: true },
  destination: { type: String, required: true },
  vehicleRegNumber: { type: String, required: true },
  driverId: { type: String },
  driverName: { type: String, required: true },
  driverPhone: { type: String, required: true },
  cargoDescription: { type: String, default: 'General Cargo' },
  weightTons: { type: Number, required: true },
  totalDistanceKm: { type: Number, required: true },
  completedDistanceKm: { type: Number, default: 0 },
  status: { type: String, default: 'DISPATCHED' },
  slaStatus: { type: String, default: 'ON_TIME' },
  eta: { type: Date },
  dispatchedAt: { type: Date },
  freightAmount: { type: Number, required: true },
  advancePaid: { type: Number, default: 0 },
  detentionAccrued: { type: Number, default: 0 },
  checkpoints: [
    {
      name: String,
      timestamp: Date,
      status: { type: String, default: 'PENDING' },
    },
  ],
  pod: {
    signedByName: String,
    podPhotoUrl: String,
    submittedAt: Date,
    isCleanPOD: { type: Boolean, default: true },
    shortageUnits: { type: Number, default: 0 },
    damageUnits: { type: Number, default: 0 },
  },
  ewayBillNumber: { type: String },
  ewayBillValidUntil: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

export const TripModel = mongoose.models.Trip || mongoose.model<ITrip>('Trip', TripSchema);

// --- BOOKING MODEL ---
export interface IBooking {
  id: string;
  tenantId: string;
  clientName: string;
  pickupLocation: string;
  deliveryLocation: string;
  expectedWeightTons: number;
  vehicleTypeRequired: string;
  quotedRate: number;
  status: string;
  createdAt: Date;
}

const BookingSchema = new Schema<IBooking>({
  id: { type: String, required: true, unique: true },
  tenantId: { type: String, required: true, index: true },
  clientName: { type: String, required: true },
  pickupLocation: { type: String, required: true },
  deliveryLocation: { type: String, required: true },
  expectedWeightTons: { type: Number, required: true },
  vehicleTypeRequired: { type: String, default: 'CONTAINER_CLOSED' },
  quotedRate: { type: Number, required: true },
  status: { type: String, default: 'CONFIRMED' },
  createdAt: { type: Date, default: Date.now },
});

export const BookingModel = mongoose.models.Booking || mongoose.model<IBooking>('Booking', BookingSchema);

// --- INVOICE MODEL ---
export interface IInvoice {
  id: string;
  tenantId: string;
  tripId?: string;
  clientName: string;
  clientGstin: string;
  sacCode: string;
  freightAmount: number;
  detentionAmount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  status: string;
  irn?: string;
  qrCodeData?: string;
  issuedDate: Date;
  dueDate?: Date;
  paidAt?: Date;
  dsoDays: number;
}

const InvoiceSchema = new Schema<IInvoice>({
  id: { type: String, required: true, unique: true },
  tenantId: { type: String, required: true, index: true },
  tripId: { type: String },
  clientName: { type: String, required: true },
  clientGstin: { type: String, required: true },
  sacCode: { type: String, default: '996511' },
  freightAmount: { type: Number, required: true },
  detentionAmount: { type: Number, default: 0 },
  taxableAmount: { type: Number, required: true },
  cgstAmount: { type: Number, default: 0 },
  sgstAmount: { type: Number, default: 0 },
  igstAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  status: { type: String, default: 'DRAFT' },
  irn: { type: String },
  qrCodeData: { type: String },
  issuedDate: { type: Date, default: Date.now },
  dueDate: { type: Date },
  paidAt: { type: Date },
  dsoDays: { type: Number, default: 0 },
});

export const InvoiceModel = mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', InvoiceSchema);

// --- APPROVAL MODEL ---
export interface IApproval {
  id: string;
  tenantId: string;
  department: 'FINANCE' | 'OPERATIONS';
  category: string;
  title: string;
  requestedBy: string;
  driverPhone?: string;
  vehicleRegNumber?: string;
  tripId?: string;
  amount: number;
  fuelDetails?: {
    pumpName: string;
    volumeLitres: number;
    ratePerLitre: number;
    totalAmount: number;
    slipNumber: string;
    odometerKm?: number;
    calculatedMileage?: string;
    receiptUrl?: string;
    geoCheckPassed?: boolean;
  };
  reason?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  decidedBy?: string;
  decisionComment?: string;
  decidedAt?: Date;
  createdAt: Date;
}

const ApprovalSchema = new Schema<IApproval>({
  id: { type: String, required: true, unique: true },
  tenantId: { type: String, required: true, index: true },
  department: { type: String, enum: ['FINANCE', 'OPERATIONS'], required: true },
  category: { type: String, required: true },
  title: { type: String, required: true },
  requestedBy: { type: String, required: true },
  driverPhone: { type: String },
  vehicleRegNumber: { type: String },
  tripId: { type: String },
  amount: { type: Number, required: true },
  fuelDetails: {
    pumpName: String,
    volumeLitres: Number,
    ratePerLitre: Number,
    totalAmount: Number,
    slipNumber: String,
    odometerKm: Number,
    calculatedMileage: String,
    receiptUrl: String,
    geoCheckPassed: Boolean,
  },
  reason: { type: String },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
  decidedBy: { type: String },
  decisionComment: { type: String },
  decidedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

export const ApprovalModel = mongoose.models.Approval || mongoose.model<IApproval>('Approval', ApprovalSchema);
